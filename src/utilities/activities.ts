import { compare } from './generic';
import { getDoyTimeFromDuration, getUnixEpochTime } from './time';

/**
 * Recursively converts an Activity to an ActivityPoint.
 * Sorts child activity points in start time ascending order.
 */
export function activityToPoint(
  activitiesMap: ActivitiesMap,
  activity: Activity,
  selectedActivityId: number | null,
): ActivityPoint {
  const children = activity?.children
    ? [...activity.children]
        .sort((aId: number, bId: number): number => {
          const a = activitiesMap[aId];
          const b = activitiesMap[bId];

          if (a && b) {
            const aStartTime = getUnixEpochTime(a.startTime);
            const bStartTime = getUnixEpochTime(b.startTime);
            return compare(aStartTime, bStartTime);
          }

          return 0;
        })
        .map(childId => activityToPoint(activitiesMap, activitiesMap[childId], selectedActivityId))
    : [];

  const point: ActivityPoint = {
    children,
    duration: activity?.duration / 1000 || 0, // µs -> ms
    id: activity.id,
    label: { text: activity.type },
    name: `${activity.id}`,
    parent: activity?.parent || null,
    selected: selectedActivityId === activity.id,
    type: 'activity',
    x: getUnixEpochTime(activity.startTime),
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
      const aStartTime = getUnixEpochTime(a.startTime);
      const bStartTime = getUnixEpochTime(b.startTime);
      return compare(aStartTime, bStartTime);
    })
    .map(activity => activityToPoint(activitiesMap, activity, selectedActivityId));
}

/**
 * Converts any activity to an Activity.
 */
export function toActivity(activity: any, startTime: Date): Activity {
  return {
    arguments: activity.arguments,
    children: [],
    duration: 0,
    id: activity.id,
    parent: null,
    startTime: getDoyTimeFromDuration(startTime, activity.startOffset),
    type: activity.type,
  };
}
