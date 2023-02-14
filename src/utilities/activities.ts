import { omitBy } from 'lodash-es';
import type {
  ActivitiesMap,
  Activity,
  ActivityDirective,
  ActivityDirectiveId,
  ActivityUniqueId,
} from '../types/activity';
import type { ActivityMetadata, ActivityMetadataKey, ActivityMetadataValue } from '../types/activity-metadata';
import type { PlanMergeActivityDirective, PlanSlimmer } from '../types/plan';
import type { Span, SpanId } from '../types/simulation';
import { compare, isEmpty } from './generic';
import { getDoyTimeFromDuration, getUnixEpochTime } from './time';

type ActivityStartTimesMap = {
  [activityUniqueId: ActivityUniqueId]: string;
};
type TraversalMap = {
  [activityUniqueId: ActivityUniqueId]: boolean;
};
function determineActivityDirectiveStartTime(
  directiveUniqueId: ActivityUniqueId,
  plan: PlanSlimmer,
  activitiesMap: ActivitiesMap = {},
  cachedStartTimes: ActivityStartTimesMap = {},
  traversalMap: TraversalMap = {},
): string | never {
  const { id: planId, start_time: planStartTime, end_time_doy } = plan;

  // if the start time has already been determined in an earlier iteration
  if (cachedStartTimes[directiveUniqueId]) {
    return cachedStartTimes[directiveUniqueId];
  }

  const activityDirective = activitiesMap[directiveUniqueId];
  if (activityDirective) {
    const anchoredToStart = activityDirective?.anchored_to_start ?? true;
    if (activityDirective.anchor_id != null) {
      const uniqueId = getActivityDirectiveUniqueId(planId, activityDirective.anchor_id);
      const anchoredActivity = activitiesMap[uniqueId];

      if (traversalMap[uniqueId]) {
        throw Error(`Cycle detected with Activity: ${uniqueId}`);
      }
      const startTime = getDoyTimeFromDuration(
        `${new Date(
          getUnixEpochTime(
            getDoyTimeFromDuration(
              `${new Date(
                getUnixEpochTime(
                  determineActivityDirectiveStartTime(uniqueId, plan, activitiesMap, cachedStartTimes, {
                    ...traversalMap,
                    [uniqueId]: true,
                  }),
                ),
              )}`,
              anchoredToStart ? '0' : anchoredActivity.duration ?? '0',
            ),
          ),
        )}`,
        activityDirective.start_offset,
      );
      cachedStartTimes[uniqueId] = startTime;
      return startTime;
    }

    const startTimeFromPlan = getDoyTimeFromDuration(
      anchoredToStart ? planStartTime : `${new Date(getUnixEpochTime(end_time_doy))}`,
      activityDirective.start_offset,
    );
    cachedStartTimes[directiveUniqueId] = startTimeFromPlan;
    return startTimeFromPlan;
  }

  return planStartTime;
}

/**
 * Creates a map of activities from directives and spans.
 */
export function createActivitiesMap(
  plan: PlanSlimmer,
  activity_directives: ActivityDirective[],
  spans: Span[],
): ActivitiesMap {
  const { id: plan_id, start_time: plan_start_time, end_time_doy } = plan;
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
        const directiveUniqueId = getActivityDirectiveUniqueId(plan.id, directiveId);
        activityDirectiveUniqueIdToSpan[directiveUniqueId] = span;
        spanIdToDirectiveId[span.id] = directiveId;
        spanUniqueIdToDirectiveUniqueId[spanUniqueId] = directiveUniqueId;
      }
    }
  }

  for (const activityDirective of activity_directives) {
    const activityDirectiveUniqueId = getActivityDirectiveUniqueId(activityDirective.plan_id, activityDirective.id);
    const span = activityDirectiveUniqueIdToSpan[activityDirectiveUniqueId];
    const spanUniqueId = span ? `span_${span.id}` : null;

    activitiesMap[activityDirectiveUniqueId] = {
      anchor_id: activityDirective.anchor_id,
      anchor_validations: activityDirective.anchor_validations,
      anchored_to_start: activityDirective.anchored_to_start,
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
      start_offset: activityDirective.start_offset,
      start_time_doy: getDoyTimeFromDuration(
        activityDirective.anchored_to_start ? plan_start_time : `${new Date(getUnixEpochTime(end_time_doy))}`,
        activityDirective.start_offset,
      ),
      tags: activityDirective.tags,
      type: activityDirective.type,
      unfinished: span?.duration === null,
      uniqueId: activityDirectiveUniqueId,
    };
  }

  // go through each directive again to determine actual `start_time_doy` value
  for (const activityDirective of activity_directives) {
    const activityDirectiveUniqueId = getActivityDirectiveUniqueId(activityDirective.plan_id, activityDirective.id);

    activitiesMap[activityDirectiveUniqueId] = {
      ...activitiesMap[activityDirectiveUniqueId],
      start_time_doy: determineActivityDirectiveStartTime(activityDirectiveUniqueId, plan, activitiesMap),
    };
  }

  for (const span of childSpans) {
    const spanParentUniqueId = `span_${span.parent_id}`;
    const spanUniqueId = `span_${span.id}`;

    activitiesMap[spanUniqueId] = {
      anchor_id: null,
      anchored_to_start: true,
      arguments: span.attributes?.arguments ?? {},
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
      start_offset: span.start_offset,
      start_time_doy: getDoyTimeFromDuration(plan_start_time, span.start_offset),
      tags: [],
      type: span.type,
      unfinished: span.duration === null,
      uniqueId: spanUniqueId,
    };
  }
  return activitiesMap;
}

/**
 * Parses a unique string activity id into it's original id and plan id.
 */
export function decomposeActivityDirectiveId(id: ActivityUniqueId): {
  activityId: ActivityDirectiveId;
  planId: number;
} {
  const matches = id.match(/directive_(?<planId>\d+)_(?<activityId>\d+)/i);

  if (matches?.length > 0) {
    const { groups: { planId, activityId } = {} } = matches;

    return {
      activityId: parseInt(activityId),
      planId: parseInt(planId),
    };
  }

  throw new Error(`Invalid Activity Directive ID (${id}) provided`);
}

/**
 * Converts a PlanMergeActivityDirective into an Activity for use in plan merge review.
 */
export function deriveActivityFromMergeActivityDirective(
  activityDirective: PlanMergeActivityDirective,
  plan: PlanSlimmer,
): Activity {
  return {
    anchor_id: activityDirective.anchor_id,
    anchored_to_start: activityDirective.anchored_to_start,
    arguments: activityDirective.arguments,
    attributes: null,
    childUniqueIds: [],
    created_at: activityDirective.created_at,
    duration: null,
    id: activityDirective.id,
    last_modified_at: activityDirective.last_modified_at,
    metadata: activityDirective.metadata,
    name: activityDirective.name,
    parentUniqueId: null,
    parent_id: null,
    plan_id: plan.id,
    simulated_activity_id: null,
    source_scheduling_goal_id: activityDirective.source_scheduling_goal_id,
    start_offset: activityDirective.start_offset,
    start_time_doy: getDoyTimeFromDuration(plan.start_time, activityDirective.start_offset),
    tags: activityDirective.tags,
    type: activityDirective.type,
    unfinished: null,
    uniqueId: getActivityDirectiveUniqueId(plan.id, activityDirective.id),
  };
}

/**
 * Returns a unique string id for an activity directive.
 * It is just the regular id prefixed with 'directive_' and the plan id.
 */
export function getActivityDirectiveUniqueId(planId: number, activityId: ActivityDirectiveId): ActivityUniqueId {
  if (planId == null) {
    throw new Error('Empty plan ID provided');
  }
  if (activityId == null) {
    throw new Error('Empty activity ID provided');
  }

  return `directive_${planId}_${activityId}`;
}

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

/**
 * Sort function to sort activities in start time ascending order.
 */
export function sortActivities(a: Activity, b: Activity): number {
  const aStartTime = getUnixEpochTime(a.start_time_doy);
  const bStartTime = getUnixEpochTime(b.start_time_doy);
  return compare(aStartTime, bStartTime);
}

export function isDirective(activity: Activity) {
  return activity.parent_id === null;
}

export function isSpan(activity: Activity) {
  return !isDirective(activity);
}
