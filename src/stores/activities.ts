import { keyBy } from 'lodash-es';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import {
  activitiesToPoints,
  activityDirectiveToActivity,
  activitySimulatedToActivity,
  getChildIdsFn,
  getParentIdFn,
} from '../utilities/activities';
import gql from '../utilities/gql';
import { planId } from './plan';
import { simulationDatasetId } from './simulation';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const activitiesMap = gqlSubscribable<ActivitiesMap>(
  gql.SUB_ACTIVITIES,
  { planId, simulationDatasetId },
  {},
  (data: SubActivitiesResponse) => {
    const { activity_directives, simulations, start_time } = data;
    const [{ simulation_datasets } = { simulation_datasets: [] }] = simulations;
    const [{ simulated_activities } = { simulated_activities: [] }] = simulation_datasets;

    const getParentId = getParentIdFn(activity_directives);
    const getChildIds = getChildIdsFn(simulated_activities);

    const newActivities: Activity[] = [
      ...activity_directives.map((activityDirective: ActivityDirective) =>
        activityDirectiveToActivity(start_time, activityDirective, getChildIds),
      ),
      ...simulated_activities.map((activitySimulated: ActivitySimulated) =>
        activitySimulatedToActivity(start_time, activitySimulated, getChildIds, getParentId),
      ),
    ];

    return keyBy(newActivities, 'id');
  },
);

export const activityMetadataDefinitions = gqlSubscribable<ActivityMetadataDefinition[]>(
  gql.SUB_ACTIVITY_DIRECTIVE_METADATA_SCHEMAS,
  {},
  [],
);

/* Writeable. */

export const selectedActivityId: Writable<number | null> = writable(null);

/* Derived. */

export const activities = derived(activitiesMap, $activitiesMap => Object.values($activitiesMap)) as Readable<
  Activity[]
>;

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
  activityMetadataDefinitions.updateValue(() => []);
  activitiesMap.updateValue(() => ({}));
  selectedActivityId.set(null);
}
