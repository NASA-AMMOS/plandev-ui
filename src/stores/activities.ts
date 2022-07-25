import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { activitiesToPoints } from '../utilities/activities';

/**
 * Main store for activities.
 */
export const activitiesMap: Writable<ActivitiesMap> = writable({});

/**
 * Derived store that converts the activities map into a list of activities.
 */
export const activities = derived(activitiesMap, $activitiesMap => Object.values($activitiesMap)) as Readable<
  Activity[]
>;

/**
 * Store that tracks the currently selected activity ID.
 */
export const selectedActivityId: Writable<number | null> = writable(null);

/**
 * Derived store that returns either the selected activity or null if no activity is selected.
 */
export const selectedActivity = derived(
  [activitiesMap, selectedActivityId],
  ([$activitiesMap, $selectedActivityId]) => $activitiesMap[$selectedActivityId] || null,
);

/**
 * Derived store that transforms activities to activity points.
 * Returns a list of activity points and nested child activity points sorted by start time ascending.
 */
export const activityPoints = derived(
  [activitiesMap, activities, selectedActivityId],
  ([$activitiesMap, $activities, $selectedActivityId]) =>
    activitiesToPoints($activitiesMap, $activities, $selectedActivityId),
);

/**
 * Derived store that converts the selected activity id to a list of selected activity ids.
 */
export const selectedActivityIds: Readable<ActivityId[]> = derived(selectedActivityId, $selectedActivityId => [
  $selectedActivityId,
]);

/* Helper Functions. */

export function resetActivityStores() {
  activitiesMap.set({});
  selectedActivityId.set(null);
}
