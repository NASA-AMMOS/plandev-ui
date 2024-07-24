import { keyBy, omitBy } from 'lodash-es';
import type { ActivityDirective, ActivityDirectiveDB, ActivityDirectivesMap } from '../types/activity';
import type { ActivityMetadata, ActivityMetadataKey, ActivityMetadataValue } from '../types/activity-metadata';
import type { Plan } from '../types/plan';
import type { Span, SpanId, SpanUtilityMaps, SpansMap } from '../types/simulation';
import { compare, isEmpty } from './generic';
import { getActivityDirectiveStartTimeMs, getIntervalInMs } from './time';

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
 * Returns thd children IDs of a span
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
