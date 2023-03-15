import { omitBy } from 'lodash-es';
import type { ActivityDirective } from '../types/activity';
import type { ActivityMetadata, ActivityMetadataKey, ActivityMetadataValue } from '../types/activity-metadata';
import type { Span, SpanId, SpansMap } from '../types/simulation';
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

/**
 * Sort function to sort activities in start time ascending order.
 */
export function sortActivityDirectives(a: ActivityDirective, b: ActivityDirective): number {
  const aStartOffsetMs = getIntervalInMs(a.start_offset);
  const bStartOffsetMs = getIntervalInMs(b.start_offset);
  return compare(aStartOffsetMs, bStartOffsetMs);
}
