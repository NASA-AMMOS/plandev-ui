import { derived, writable, type Writable } from 'svelte/store';
import { plan } from '../stores/plan';
import gql from '../utilities/gql';
import type { Status } from '../utilities/status';
import { gqlSubscribable } from './subscribable';

/* Writeable. */

export const schedulingColumns: Writable<string> = writable('1fr 3px 2fr');
export const schedulingConditionsColumns: Writable<string> = writable('1fr 3px 2fr');
export const schedulingGoalsColumns: Writable<string> = writable('1fr 3px 2fr');
export const schedulingStatus: Writable<Status | null> = writable(null);

/* Derived. */

export const selectedSpecId = derived(plan, $plan => $plan?.scheduling_specifications[0]?.id ?? null);

/* Subscriptions. */

export const schedulingConditions = gqlSubscribable<SchedulingCondition[]>(gql.SUB_SCHEDULING_CONDITIONS, {}, []);

export const schedulingGoals = gqlSubscribable<SchedulingGoal[]>(gql.SUB_SCHEDULING_GOALS, {}, []);

export const schedulingSpecConditions = gqlSubscribable<SchedulingSpecCondition[]>(
  gql.SUB_SCHEDULING_SPEC_CONDITIONS,
  { specification_id: selectedSpecId },
  [],
);

export const schedulingSpecGoals = gqlSubscribable<SchedulingSpecGoal[]>(
  gql.SUB_SCHEDULING_SPEC_GOALS,
  { specification_id: selectedSpecId },
  [],
);

/* Helper Functions. */

export function resetSchedulingStores() {
  schedulingStatus.set(null);
}
