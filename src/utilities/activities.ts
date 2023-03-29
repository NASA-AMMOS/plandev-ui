import { omitBy } from 'lodash-es';
import type { ActivityDirective } from '../types/activity';
import type { ActivityMetadata, ActivityMetadataKey, ActivityMetadataValue } from '../types/activity-metadata';
import type { Span, SpanId, SpansMap, SpanUtilityMaps } from '../types/simulation';
import { compare, isEmpty } from './generic';
import { getIntervalInMs } from './time';

/**
 * Updates activity metadata with a new key/value and removes any empty values.
 */
export function getActivityMetadata(
  activityMetadata: ActivityMetadata,
  key: ActivityMetadataKey,
  value: ActivityMetadataValue,
): ActivityMetadata {
  const newActivityMetadataEntry = { [key]: value };
  return omitBy({ ...activityMetadata, ...newActivityMetadataEntry }, isEmpty);
}

/**
 * Returns the root span for a given span id.
 */
export function getSpanRootParent(spansMap: SpansMap, spanId: SpanId): Span | null {
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
    if (map.spanIdToChildIdsMap[span.id] === undefined) {
      map.spanIdToChildIdsMap[span.id] = [];
    }
    if (span.parent_id !== null) {
      if (map.spanIdToChildIdsMap[span.parent_id] === undefined) {
        map.spanIdToChildIdsMap[span.parent_id] = [span.id];
      } else {
        map.spanIdToChildIdsMap[span.parent_id].push(span.id);
      }
    }

    // Span <-> Directive mappings.
    const directiveId = span.attributes?.directiveId;
    if (directiveId !== null && directiveId !== undefined) {
      map.directiveIdToSpanIdMap[directiveId] = span.id;
      map.spanIdToDirectiveIdMap[span.id] = directiveId;
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
    return compare(a.id, b.id);
  }
  return compare(aStartOffsetMs, bStartOffsetMs);
}
