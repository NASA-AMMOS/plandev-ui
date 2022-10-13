import { omitBy } from 'lodash-es';
import { compare, isEmpty } from './generic';
import { getDurationInMs, getUnixEpochTime } from './time';

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
            const aStartTime = getUnixEpochTime(a.start_time_doy);
            const bStartTime = getUnixEpochTime(b.start_time_doy);
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

  let activityLabelText = activity.name;

  if (activity.parent_id !== null) {
    activityLabelText = activity.type;
  }

  if (activity.unfinished) {
    activityLabelText = `${activityLabelText} (Unfinished)`;
  }

  const point: ActivityPoint = {
    children,
    duration: getDurationInMs(activity.duration),
    id: activity.id,
    label: {
      color: activity.unfinished ? '#ff7760' : null,
      text: activityLabelText,
    },
    name: activity.name,
    parent_id: activity.parent_id,
    selected: selectedActivityId === activity.id,
    type: 'activity',
    unfinished: activity.unfinished,
    x: getUnixEpochTime(activity.start_time_doy),
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
      const aStartTime = getUnixEpochTime(a.start_time_doy);
      const bStartTime = getUnixEpochTime(b.start_time_doy);
      return compare(aStartTime, bStartTime);
    })
    .map(activity => activityToPoint(activitiesMap, activity, selectedActivityId));
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
