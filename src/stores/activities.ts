import { derived, get, writable, type Readable, type Writable } from 'svelte/store';
import { activitiesToPoints } from '../utilities/activities';
import gql from '../utilities/gql';
import { getDoyTimeFromDuration } from '../utilities/time';
import { plan, planId } from './plan';
import { simulationDatasetId } from './simulation';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const activitiesMap = gqlSubscribable<ActivitiesMap>(
  gql.SUB_ACTIVITIES,
  { planId, simulationDatasetId },
  {},
  (data: SubActivitiesResponse) => {
    const { start_time: plan_start_time } = get<Plan>(plan);
    const { activity_directives, simulations } = data;
    const [{ simulation_datasets } = { simulation_datasets: [] }] = simulations;
    const [{ simulated_activities } = { simulated_activities: [] }] = simulation_datasets;

    // For each directive, map each simulated activity to it's directive activity id.
    const simulatedIdToDirectiveId = activity_directives.reduce(
      (map: Record<ActivitySimulatedId, ActivityDirectiveId>, activityDirective: ActivityDirective) => {
        const { simulated_activities } = activityDirective;
        const activitySimulated = simulated_activities[0];

        if (activitySimulated) {
          map[activitySimulated.id] = activityDirective.id;
        }

        return map;
      },
      {},
    );

    // Map each simulated activity id to it's list of simulated activity child ids.
    const parentIdToChildIds = simulated_activities.reduce(
      (map: Record<ActivitySimulatedId, ActivitySimulatedId[]>, activitySimulated: ActivitySimulated) => {
        if (map[activitySimulated.parent_id] === undefined) {
          map[activitySimulated.parent_id] = [activitySimulated.id];
        } else {
          map[activitySimulated.parent_id].push(activitySimulated.id);
        }
        return map;
      },
      {},
    );

    const activitiesMap: ActivitiesMap = {};

    for (const activityDirective of activity_directives) {
      const { simulated_activities } = activityDirective;
      const activitySimulated = simulated_activities[0];

      activitiesMap[activityDirective.id] = {
        arguments: activityDirective.arguments,
        attributes: activitySimulated?.attributes ?? null,
        child_ids: parentIdToChildIds[activitySimulated?.id] ?? [],
        created_at: activityDirective.created_at,
        duration: activitySimulated?.duration ?? null,
        id: activityDirective.id,
        last_modified_at: activityDirective.last_modified_at,
        metadata: activityDirective.metadata,
        name: activityDirective.name,
        parent_id: null,
        simulated_activity_id: activitySimulated?.id ?? null,
        simulation_dataset_id: activitySimulated?.simulation_dataset_id ?? null,
        source_scheduling_goal_id: activityDirective.source_scheduling_goal_id,
        start_time_doy: getDoyTimeFromDuration(plan_start_time, activityDirective.start_offset),
        tags: activityDirective.tags,
        type: activityDirective.type,
        unfinished: activitySimulated?.duration === null,
        uniqueId: `directive_${activityDirective.id}`,
      };
    }

    for (const activitySimulated of simulated_activities) {
      activitiesMap[activitySimulated.id] = {
        arguments: {},
        attributes: activitySimulated.attributes,
        child_ids: parentIdToChildIds[activitySimulated.id] ?? [],
        created_at: '',
        duration: activitySimulated.duration,
        id: activitySimulated.id,
        last_modified_at: '',
        metadata: {},
        name: '',
        parent_id: simulatedIdToDirectiveId[activitySimulated.parent_id] ?? activitySimulated.parent_id,
        simulated_activity_id: activitySimulated.id,
        simulation_dataset_id: activitySimulated.simulation_dataset_id,
        source_scheduling_goal_id: null,
        start_time_doy: getDoyTimeFromDuration(plan_start_time, activitySimulated.start_offset),
        tags: [],
        type: activitySimulated.activity_type_name,
        unfinished: activitySimulated.duration === null,
        uniqueId: `simulated_${activitySimulated.id}`,
      };
    }

    return activitiesMap;
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
