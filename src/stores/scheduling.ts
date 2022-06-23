import { derived, writable, type Writable } from 'svelte/store';
import { plan } from '../stores/plan';
import { compare } from '../utilities/generic';
import gql from '../utilities/gql';
import { Status } from '../utilities/status';
import { gqlSubscribable } from './subscribable';

/* Stores. */

export const schedulingSpecGoals = gqlSubscribable<SchedulingSpecGoal[]>(
  gql.SUB_SCHEDULING_SPEC_GOALS,
  { specification_id: -1 },
  [],
  (specGoals: SchedulingSpecGoal[]) =>
    specGoals.sort((specGoalA, specGoalB) => compare(specGoalA.priority, specGoalB.priority)),
);

export const schedulingStatus: Writable<Status> = writable(Status.Clean);

export const schedulingTsFiles: Writable<TypeScriptFile[]> = writable([]);

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
  schedulingTsFiles.set([]);
  selectedGoalId.set(null);
}
