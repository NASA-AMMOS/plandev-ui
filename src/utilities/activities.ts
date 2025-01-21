import { keyBy, omitBy } from 'lodash-es';
import type { ActivityDirective, ActivityDirectiveDB, ActivityDirectivesMap } from '../types/activity';
import type { ActivityMetadata, ActivityMetadataKey, ActivityMetadataValue } from '../types/activity-metadata';
import type { Plan } from '../types/plan';
import type { Span, SpanId, SpanUtilityMaps, SpansMap } from '../types/simulation';
import { compare, isEmpty } from './generic';
import {
  getActivityDirectiveStartTimeMs,
  getDoyTime,
  getIntervalFromDoyRange,
  getIntervalInMs,
  getUnixEpochTime,
} from './time';
import { getSessionStorageClipboard, setSessionStorageClipboard } from './sessionStorageClipboard';
import { showSuccessToast } from './toast';

/**
 * Updates activity metadata with a new key/value and removes any empty values.
 */
export function getActivityMetadata(
  activityMetadata: ActivityMetadata | Record<ActivityMetadataKey, null>,
  key: ActivityMetadataKey,
  value: ActivityMetadataValue,
): ActivityMetadata {
  const newActivityMetadataEntry = { [key]: value };
  return omitBy({ ...activityMetadata, ...newActivityMetadataEntry }, isEmpty) as ActivityMetadata;
}

/**
 * Returns the root span for a given span id.
 */
export function getSpanRootParent(spansMap: SpansMap, spanId: SpanId | null): Span | null {
  if (spanId === null) {
    return null;
  }
  const span = spansMap[spanId];
  if (!span) {
    return null;
  }
  if (span.parent_id === null) {
    return span;
  }
  return getSpanRootParent(spansMap, span.parent_id);
}

export function createSpanUtilityMaps(spans: Span[]): SpanUtilityMaps {
  const spanUtilityMaps: SpanUtilityMaps = {
    directiveIdToSpanIdMap: {},
    spanIdToChildIdsMap: {},
    spanIdToDirectiveIdMap: {},
  };
  return spans.reduce((map, span) => {
    // Span Child mappings.
    if (map.spanIdToChildIdsMap[span.span_id] === undefined) {
      map.spanIdToChildIdsMap[span.span_id] = [];
    }
    if (span.parent_id !== null) {
      if (map.spanIdToChildIdsMap[span.parent_id] === undefined) {
        map.spanIdToChildIdsMap[span.parent_id] = [span.span_id];
      } else {
        map.spanIdToChildIdsMap[span.parent_id].push(span.span_id);
      }
    }

    // Span <-> Directive mappings.
    const directiveId = span.attributes?.directiveId;
    if (directiveId !== null && directiveId !== undefined) {
      map.directiveIdToSpanIdMap[directiveId] = span.span_id;
      map.spanIdToDirectiveIdMap[span.span_id] = directiveId;
    }
    return map;
  }, spanUtilityMaps);
}

/**
 * Returns all spans for a directive
 */
export function getAllSpansForActivityDirective(
  activityDirectiveId: number,
  spansMap: SpansMap,
  spanUtilityMaps: SpanUtilityMaps,
): Span[] {
  const primarySpanId = spanUtilityMaps.directiveIdToSpanIdMap[activityDirectiveId];
  if (primarySpanId === undefined) {
    return [];
  }
  const childSpanIds = getAllSpanChildrenIds(primarySpanId, spanUtilityMaps);
  const allSpanIds = [primarySpanId, ...childSpanIds];
  return allSpanIds.map(spanId => spansMap[spanId]).sort(sortActivityDirectivesOrSpans);
}

/**
 * Returns the children IDs of a span
 */
export function getAllSpanChildrenIds(spanId: number, spanUtilityMaps: SpanUtilityMaps): number[] {
  const children = spanUtilityMaps.spanIdToChildIdsMap[spanId];
  if (children !== undefined && children.length) {
    return children.concat(...children.map(child => getAllSpanChildrenIds(child, spanUtilityMaps)));
  }
  return [];
}

/**
 * Sort function to sort activities in start time ascending order.
 */
export function sortActivityDirectivesOrSpans(a: ActivityDirective | Span, b: ActivityDirective | Span): number {
  const aStartOffsetMs = getIntervalInMs(a.start_offset);
  const bStartOffsetMs = getIntervalInMs(b.start_offset);
  if (aStartOffsetMs === bStartOffsetMs) {
    if ('span_id' in a && 'span_id' in b) {
      return compare((a as Span).span_id, (b as Span).span_id);
    } else if ('id' in a && 'id' in b) {
      return compare((a as ActivityDirective).id, (b as ActivityDirective).id);
    }
    throw 'You can only sort ActivityDirective or Span';
  }
  return compare(aStartOffsetMs, bStartOffsetMs);
}

export enum ActivityDeletionAction {
  ANCHOR_PLAN = 'anchor-plan',
  ANCHOR_ROOT = 'anchor-root',
  DELETE_CHAIN = 'delete-chain',
  NORMAL = 'regular-directive-delete',
}

export function computeActivityDirectivesMap(
  activityDirectiveDBs: ActivityDirectiveDB[],
  plan: Plan,
  spansMap: SpansMap,
  spanUtilityMaps: SpanUtilityMaps,
) {
  // Compute initial map
  const directiveDBMap = keyBy(
    activityDirectiveDBs.map(d => ({ ...d, start_time_ms: null })),
    'id',
  );
  const cachedStartTimes = {};
  const activityDirectives = activityDirectiveDBs.map(activityDirectiveDB =>
    preprocessActivityDirectiveDB(
      activityDirectiveDB,
      directiveDBMap,
      plan,
      spansMap,
      spanUtilityMaps,
      cachedStartTimes,
    ),
  );
  return keyBy(activityDirectives, 'id');
}

export function preprocessActivityDirectiveDB(
  activityDirectiveDB: ActivityDirectiveDB,
  activityDirectivesMap: ActivityDirectivesMap,
  plan: Plan,
  spansMap: SpansMap,
  spanUtilityMaps: SpanUtilityMaps,
  cachedStartTimes = {},
): ActivityDirective {
  let start_time_ms = null;
  if (plan && typeof plan.start_time === 'string') {
    start_time_ms = getActivityDirectiveStartTimeMs(
      activityDirectiveDB.id,
      plan.start_time,
      plan.end_time_doy,
      activityDirectivesMap,
      spansMap,
      spanUtilityMaps,
      cachedStartTimes,
    );
  }
  return { ...activityDirectiveDB, start_time_ms };
}

export function copyActivityDirectivesToClipboard(sourcePlan: Plan, activities: ActivityDirective[]) {
  const copiedActivityIds = new Set(activities.map(a => a.id));
  const clippedActivities = activities.map(activity => {
    const anchorInSelection = activity.anchor_id !== null && copiedActivityIds.has(activity.anchor_id);
    return {
      anchor_id: anchorInSelection ? activity.anchor_id : null,
      anchored_to_start: activity.anchored_to_start,
      arguments: activity.arguments,
      id: activity.id,
      name: activity.name,
      start_offset: activity.anchor_id !== null && !anchorInSelection ? '0' : activity.start_offset,
      start_time_ms: activity.start_time_ms,
      tags: activity.tags,
      type: activity.type,
    };
  });

  const clipboard = {
    activities: clippedActivities,
    sourcePlanId: sourcePlan.id,
  };

  setSessionStorageClipboard(JSON.stringify(clipboard));
  showSuccessToast(`Copied ${activities.length} Activity Directive${activities.length === 1 ? '' : 's'}`);
}

export function getPasteActivityDirectivesText(): string | undefined {
  try {
    const serializedClipboard = getSessionStorageClipboard();
    if (serializedClipboard !== null) {
      const clipboard = JSON.parse(serializedClipboard);
      if (Array.isArray(clipboard.activities)) {
        const n = clipboard.activities.length;
        return `Paste ${n} Activity Directive${n === 1 ? '' : 's'}`;
      }
    }
  } catch (e) {
    console.error('e');
  }
}

export function canPasteActivityDirectivesFromClipboard(destinationPlan: Plan | null): boolean {
  if (destinationPlan === null) {
    return false;
  }

  try {
    const serializedClipboard = getSessionStorageClipboard();
    if (serializedClipboard === null) {
      return false;
    }

    const clipboard = JSON.parse(serializedClipboard);
    //current scope, allows copy/paste in the same plan
    if (clipboard.sourcePlanId !== destinationPlan.id) {
      return false;
    }
  } catch (e) {
    console.error(e);
    return false;
  }

  return true;
}

export function getActivityDirectivesToPaste(
  destinationPlan: Plan,
  pasteStartingAtTime?: number,
): ActivityDirective[] | undefined {
  try {
    const serializedClipboard = getSessionStorageClipboard();
    if (serializedClipboard !== null) {
      const clipboard = JSON.parse(serializedClipboard);
      const activities: ActivityDirective[] = clipboard.activities;

      //transpose in time if we're given a time, otherwise it paste at the current time
      if (typeof pasteStartingAtTime === 'number') {
        const starts: number[] = [];
        activities.forEach(a => {
          //unachored activities are the ones we're trying to place relative to each other in time, anchored will be calculated from offset
          if (a.anchor_id === null && a.start_time_ms !== null) {
            starts.push(a.start_time_ms);
          }
        });

        const planStart = getUnixEpochTime(destinationPlan.start_time_doy);
        const earliestStart = Math.max(planStart, Math.min(...starts)); //bounded by plan start
        const diff = pasteStartingAtTime - earliestStart;

        activities.forEach(activity => {
          if (activity.start_time_ms !== null) {
            //anchored activities don't need offset to be updated
            if (activity.anchor_id === null) {
              activity.start_time_ms += diff;
              const startTimeDoy = getDoyTime(new Date(activity.start_time_ms));
              activity.start_offset = getIntervalFromDoyRange(destinationPlan.start_time_doy, startTimeDoy);
            }
          }
        });
      }
      return activities;
    }
  } catch (e) {
    console.error(e);
  }
}
