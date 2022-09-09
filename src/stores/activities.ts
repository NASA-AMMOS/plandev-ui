import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { activitiesToPoints } from '../utilities/activities';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const activityMetadataDefinitions = gqlSubscribable<ActivityMetadataDefinition[]>(
  gql.SUB_ACTIVITY_DIRECTIVE_METADATA_SCHEMAS,
  {},
  [],
);

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

export const allPlanTags: Readable<string[]> = derived(activities, $activities => {
  const tagMap = $activities.reduce((map: Record<string, boolean>, activity: Activity) => {
    activity.tags.forEach(tag => (map[tag] = true));
    return map;
  }, {});
  return Object.keys(tagMap).sort();
});

/* Helper Functions. */

export function resetActivityStores() {
  activitiesMap.set({});
  selectedActivityId.set(null);
}
