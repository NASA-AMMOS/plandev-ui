import { derived, writable, type Writable } from 'svelte/store';
import { plan } from '../stores/plan';
import gql from '../utilities/gql';
import { Status } from '../utilities/status';
import { getGqlSubscribable } from './subscribable';

/* Stores. */

export const schedulingSpecGoals = getGqlSubscribable<SchedulingSpecGoal[]>(
  gql.SUB_SCHEDULING_SPEC_GOALS,
  { specification_id: -1 },
  [],
);

export const schedulingStatus: Writable<Status> = writable(Status.Clean);

export const schedulingTsExtraLibs: Writable<TypeScriptExtraLib[]> = writable([]);

export const selectedGoalId: Writable<number | null> = writable(null);

export const selectedSpecId = derived(plan, $plan => $plan?.scheduling_specifications[0]?.id ?? null);

export const selectedSpecGoal = derived(
  [schedulingSpecGoals, selectedSpecId, selectedGoalId],
  ([$schedulingSpecGoals, $selectedSpecId, $selectedGoalId]) =>
    $schedulingSpecGoals.find(
      ({ goal: { id: goal_id }, specification_id }) =>
        $selectedSpecId !== null &&
        $selectedGoalId !== null &&
        $selectedSpecId === specification_id &&
        $selectedGoalId === goal_id,
    ) ?? null,
);

/* Helper Functions. */

export function resetSchedulingStores() {
  schedulingStatus.set(Status.Clean);
  schedulingTsExtraLibs.set([]);
  selectedGoalId.set(null);
}
