import { omitBy } from 'lodash-es';
import { compare, isEmpty } from './generic';
import { getDoyTimeFromDuration, getDurationInMs, getUnixEpochTime } from './time';

/**
 * Recursively converts an Activity to an ActivityPoint.
 * Sorts child activity points in start time ascending order.
 */
export function activityToPoint(
  activitiesMap: ActivitiesMap,
  activity: Activity,
  selectedActivityId: number | null,
): ActivityPoint {
  const children = activity?.child_ids
    ? [...activity.child_ids]
        .sort((aId: number, bId: number): number => {
          const a = activitiesMap[aId];
          const b = activitiesMap[bId];

          if (a && b) {
            const aStartTime = getUnixEpochTime(a.start_time);
            const bStartTime = getUnixEpochTime(b.start_time);
            return compare(aStartTime, bStartTime);
          }

          return 0;
        })
        .reduce((childActivityPoints, childId) => {
          const childActivity = activitiesMap[childId];

          if (childActivity) {
            const childActivityPoint = activityToPoint(activitiesMap, childActivity, selectedActivityId);
            childActivityPoints.push(childActivityPoint);
          }

          return childActivityPoints;
        }, [])
    : [];

  const point: ActivityPoint = {
    children,
    duration: getDurationInMs(activity.duration),
    id: activity.id,
    label: {
      color: activity.unfinished ? '#ff7760' : null,
      text: activity.unfinished ? `${activity.name} (Unfinished)` : activity.name,
    },
    name: activity.name,
    parent_id: activity.parent_id,
    selected: selectedActivityId === activity.id,
    type: 'activity',
    unfinished: activity.unfinished,
    x: getUnixEpochTime(activity.start_time),
  };

  return point;
}

/**
 * Transforms activities to activity points for rendering.
 * Sorts activities in start time ascending order.
 */
export function activitiesToPoints(
  activitiesMap: ActivitiesMap,
  activities: Activity[],
  selectedActivityId: number | null,
): ActivityPoint[] {
  return [...activities]
    .sort((a: Activity, b: Activity) => {
      const aStartTime = getUnixEpochTime(a.start_time);
      const bStartTime = getUnixEpochTime(b.start_time);
      return compare(aStartTime, bStartTime);
    })
    .map(activity => activityToPoint(activitiesMap, activity, selectedActivityId));
}

/**
 * Transforms directive activities to activities consumable in the UI.
 */
export function activityDirectiveToActivity(
  plan_start_time: string,
  activityDirective: ActivityDirective,
  getChildIds: (activitySimulated: ActivitySimulated) => ActivitySimulatedId[] = () => [],
): Activity {
  const { simulated_activities } = activityDirective;
  const activitySimulated = simulated_activities[0];

  return {
    arguments: activityDirective.arguments,
    attributes: activitySimulated?.attributes ?? null,
    child_ids: getChildIds(activitySimulated),
    created_at: activityDirective.created_at, // TODO how much checking should we do for these new metadata fields?
    duration: activitySimulated?.duration ?? null,
    id: activityDirective.id,
    last_modified_at: activityDirective.last_modified_at,
    metadata: activityDirective.metadata,
    name: activityDirective.name,
    parent_id: null,
    simulated_activity_id: activitySimulated?.id ?? null,
    simulation_dataset_id: activitySimulated?.simulation_dataset_id ?? null,
    source_scheduling_goal_id: activityDirective.source_scheduling_goal_id,
    start_time: getDoyTimeFromDuration(plan_start_time, activityDirective.start_offset),
    tags: activityDirective.tags,
    type: activityDirective.type,
    unfinished: activitySimulated?.duration === null,
  };
}

/**
 * Transforms simulated activities to activities consumable in the UI.
 */
export function activitySimulatedToActivity(
  plan_start_time: string,
  activitySimulated: ActivitySimulated,
  getChildIds: (activitySimulated: ActivitySimulated) => ActivitySimulatedId[],
  getParentId: (activitySimulated: ActivitySimulated) => ActivityDirectiveId | ActivitySimulatedId,
): Activity {
  return {
    arguments: {},
    attributes: activitySimulated.attributes,
    child_ids: getChildIds(activitySimulated),
    created_at: '',
    duration: activitySimulated.duration,
    id: activitySimulated.id,
    last_modified_at: '',
    metadata: {},
    name: '',
    parent_id: getParentId(activitySimulated),
    simulated_activity_id: activitySimulated.id,
    simulation_dataset_id: activitySimulated.simulation_dataset_id,
    source_scheduling_goal_id: null,
    start_time: getDoyTimeFromDuration(plan_start_time, activitySimulated.start_offset),
    tags: [],
    type: activitySimulated.activity_type_name,
    unfinished: activitySimulated.duration === null,
  };
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
export function getActivityRootParent(activitiesMap: ActivitiesMap, activityId: number): Activity | null {
  const activity = activitiesMap[activityId];
  if (!activity) {
    return null;
  }
  if (!activity.parent_id) {
    return activity;
  }
  return getActivityRootParent(activitiesMap, activity.parent_id);
}

/**
 * Returns a function that maps each simulated activity id to it's list of simulated activity child ids if they exist.
 */
export function getChildIdsFn(
  simulated_activities: ActivitySimulated[],
): (activitySimulated: ActivitySimulated) => ActivitySimulatedId[] {
  const parentIdToChildIds = simulated_activities.reduce(
    (map: Record<ActivitySimulatedId, ActivitySimulatedId[]>, activitySimulated) => {
      if (map[activitySimulated.parent_id] === undefined) {
        map[activitySimulated.parent_id] = [activitySimulated.id];
      } else {
        map[activitySimulated.parent_id].push(activitySimulated.id);
      }
      return map;
    },
    {},
  );

  return (activitySimulated: ActivitySimulated) => parentIdToChildIds[activitySimulated?.id] ?? [];
}

/**
 * Returns a function that maps each simulated activity id to it's directive activity id if one such directive activity exists.
 * If a directive activity does not exists for a given simulated activity, we just return the simulated activities parent id.
 */
export function getParentIdFn(
  directive_activities: ActivityDirective[],
): (activitySimulated: ActivitySimulated) => ActivityDirectiveId | ActivitySimulatedId {
  const simulatedIdToDirectiveId = directive_activities.reduce(
    (map: Record<ActivitySimulatedId, ActivityDirectiveId>, activityDirective) => {
      const { simulated_activities } = activityDirective;
      const activitySimulated = simulated_activities[0];

      if (activitySimulated) {
        map[activitySimulated.id] = activityDirective.id;
      }

      return map;
    },
    {},
  );

  return (activitySimulated: ActivitySimulated) =>
    simulatedIdToDirectiveId[activitySimulated.parent_id] ?? activitySimulated.parent_id;
}
