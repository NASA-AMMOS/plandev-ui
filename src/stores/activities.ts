import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { activitiesToPoints } from '../utilities/activities';

/* Writeable. */

export const activitiesMap: Writable<ActivitiesMap> = writable({});

export const selectedActivityId: Writable<number | null> = writable(null);

/* Derived. */

export const activities = derived(activitiesMap, $activitiesMap => Object.values($activitiesMap)) as Readable<
  Activity[]
>;

export const selectedActivity = derived(
  [activitiesMap, selectedActivityId],
  ([$activitiesMap, $selectedActivityId]) => $activitiesMap[$selectedActivityId] || null,
);

export const activityPoints = derived(
  [activitiesMap, activities, selectedActivityId],
  ([$activitiesMap, $activities, $selectedActivityId]) =>
    activitiesToPoints($activitiesMap, $activities, $selectedActivityId),
);

export const selectedActivityIds: Readable<ActivityId[]> = derived(selectedActivityId, $selectedActivityId => [
  $selectedActivityId,
]);

/* Helper Functions. */

export function resetActivityStores() {
  activitiesMap.set({});
  selectedActivityId.set(null);
}
