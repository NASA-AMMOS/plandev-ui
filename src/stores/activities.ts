import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { activitiesToPoints } from '../utilities/activities';
import gql from '../utilities/gql';
import { planId } from './plan';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const activityDirectives = gqlSubscribable<ActivityDirective[]>(gql.SUB_ACTIVITY_DIRECTIVES, { planId }, []);

export const activityMetadataDefinitions = gqlSubscribable<ActivityMetadataDefinition[]>(
  gql.SUB_ACTIVITY_DIRECTIVE_METADATA_SCHEMAS,
  {},
  [],
);

/* Writeable. */

export const activitiesMap: Writable<ActivitiesMap> = writable({});

export const selectedActivityId: Writable<ActivityUniqueId | null> = writable(null);

/* Derived. */

export const activities: Readable<Activity[]> = derived(activitiesMap, $activitiesMap => Object.values($activitiesMap));

export const activityPoints = derived([activitiesMap, activities], ([$activitiesMap, $activities]) =>
  activitiesToPoints($activitiesMap, $activities),
);

export const allActivityTags: Readable<string[]> = derived(activities, $activities => {
  const tagMap = $activities.reduce((map: Record<string, boolean>, activity: Activity) => {
    activity.tags.forEach(tag => (map[tag] = true));
    return map;
  }, {});
  return Object.keys(tagMap).sort();
});

export const selectedActivity = derived(
  [activitiesMap, selectedActivityId],
  ([$activitiesMap, $selectedActivityId]) => $activitiesMap[$selectedActivityId] || null,
);
/* Helper Functions. */

export function resetActivityStores() {
  activityMetadataDefinitions.updateValue(() => []);
  activitiesMap.set({});
  selectedActivityId.set(null);
}
