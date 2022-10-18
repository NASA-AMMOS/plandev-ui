import { omitBy } from 'lodash-es';
import { isEmpty } from './generic';
import { getDoyTimeFromDuration } from './time';

/**
 * Creates a map of activities from directives and spans.
 */
export function createActivitiesMap(
  plan: Plan,
  activity_directives: ActivityDirective[],
  spans: Span[],
): ActivitiesMap {
  const { id: plan_id, start_time: plan_start_time } = plan;
  const activitiesMap: ActivitiesMap = {};
  const activityDirectiveUniqueIdToSpan: Record<ActivityUniqueId, Span> = {};
  const childSpans: Span[] = [];
  const parentUniqueIdToChildUniqueIds: Record<ActivityUniqueId, ActivityUniqueId[]> = {};
  const spanIdToDirectiveId: Record<SpanId, ActivityDirectiveId> = {};
  const spanUniqueIdToDirectiveUniqueId: Record<ActivityUniqueId, ActivityUniqueId> = {};

  for (const span of spans) {
    const directiveId = span.attributes.directiveId;
    const spanParentUniqueId = `span_${span.parent_id}`;
    const spanUniqueId = `span_${span.id}`;

    if (span.parent_id !== null) {
      childSpans.push(span);

      if (parentUniqueIdToChildUniqueIds[spanParentUniqueId] === undefined) {
        parentUniqueIdToChildUniqueIds[spanParentUniqueId] = [spanUniqueId];
      } else {
        parentUniqueIdToChildUniqueIds[spanParentUniqueId].push(spanUniqueId);
      }
    } else {
      if (directiveId !== undefined) {
        const directiveUniqueId = `directive_${directiveId}`;
        activityDirectiveUniqueIdToSpan[directiveUniqueId] = span;
        spanIdToDirectiveId[span.id] = directiveId;
        spanUniqueIdToDirectiveUniqueId[spanUniqueId] = directiveUniqueId;
      }
    }
  }

  for (const activityDirective of activity_directives) {
    const activityDirectiveUniqueId = `directive_${activityDirective.id}`;
    const span = activityDirectiveUniqueIdToSpan[activityDirectiveUniqueId];
    const spanUniqueId = span ? `span_${span.id}` : null;

    activitiesMap[activityDirectiveUniqueId] = {
      arguments: activityDirective.arguments,
      attributes: span?.attributes ?? null,
      childUniqueIds: parentUniqueIdToChildUniqueIds[spanUniqueId] ?? [],
      created_at: activityDirective.created_at,
      duration: span?.duration ?? null,
      id: activityDirective.id,
      last_modified_at: activityDirective.last_modified_at,
      metadata: activityDirective.metadata,
      name: activityDirective.name,
      parentUniqueId: null,
      parent_id: null,
      plan_id: activityDirective.plan_id,
      simulated_activity_id: span?.id ?? null,
      source_scheduling_goal_id: activityDirective.source_scheduling_goal_id,
      start_time_doy: getDoyTimeFromDuration(plan_start_time, activityDirective.start_offset),
      tags: activityDirective.tags,
      type: activityDirective.type,
      unfinished: span?.duration === null,
      uniqueId: activityDirectiveUniqueId,
    };
  }

  for (const span of childSpans) {
    const spanParentUniqueId = `span_${span.parent_id}`;
    const spanUniqueId = `span_${span.id}`;

    activitiesMap[spanUniqueId] = {
      arguments: {},
      attributes: span.attributes,
      childUniqueIds: parentUniqueIdToChildUniqueIds[spanUniqueId] ?? [],
      created_at: '',
      duration: span.duration,
      id: span.id,
      last_modified_at: '',
      metadata: {},
      name: '',
      parentUniqueId: spanUniqueIdToDirectiveUniqueId[spanParentUniqueId] ?? spanParentUniqueId,
      parent_id: spanIdToDirectiveId[span.parent_id] ?? span.parent_id,
      plan_id,
      simulated_activity_id: span.id,
      source_scheduling_goal_id: null,
      start_time_doy: getDoyTimeFromDuration(plan_start_time, span.start_offset),
      tags: [],
      type: span.type,
      unfinished: span.duration === null,
      uniqueId: spanUniqueId,
    };
  }

  return activitiesMap;
}

export function getActivityMetadata(
  activityMetadata: ActivityMetadata,
  key: ActivityMetadataKey,
  value: ActivityMetadataValue,
): ActivityMetadata {
  const newActivityMetadataEntry = { [key]: value };
  return omitBy({ ...activityMetadata, ...newActivityMetadataEntry }, isEmpty);
}

/**
 * Returns the root activity for an activity id.
 */
export function getActivityRootParent(
  activitiesMap: ActivitiesMap,
  activityUniqueId: ActivityUniqueId,
): Activity | null {
  const activity = activitiesMap[activityUniqueId];
  if (!activity) {
    return null;
  }
  if (!activity.parentUniqueId) {
    return activity;
  }
  return getActivityRootParent(activitiesMap, activity.parentUniqueId);
}
