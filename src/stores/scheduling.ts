import { derived, writable, type Writable } from 'svelte/store';
import { plan } from '../stores/plan';
import { compare } from '../utilities/generic';
import gql from '../utilities/gql';
import { Status } from '../utilities/status';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const schedulingGoals = gqlSubscribable<SchedulingGoal[]>(gql.SUB_SCHEDULING_GOALS, {}, []);

export const schedulingSpecGoals = gqlSubscribable<SchedulingSpecGoal[]>(
  gql.SUB_SCHEDULING_SPEC_GOALS,
  { specification_id: -1 },
  [],
  (specGoals: SchedulingSpecGoal[]) =>
    specGoals.sort((specGoalA, specGoalB) => compare(specGoalA.priority, specGoalB.priority)),
);

/* Writeable. */

export const schedulingGoalsColumns: Writable<string> = writable('1fr 1px 2fr');

export const schedulingStatus: Writable<Status> = writable(Status.Clean);

/* Derived. */

export const selectedSpecId = derived(plan, $plan => $plan?.scheduling_specifications[0]?.id ?? null);

/* Helper Functions. */

export function resetSchedulingStores() {
  schedulingStatus.set(Status.Clean);
}
