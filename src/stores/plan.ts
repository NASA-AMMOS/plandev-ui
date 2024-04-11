import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ActivityType } from '../types/activity';
import type { Plan, PlanMergeRequest, PlanMergeRequestSchema, PlanMetadata } from '../types/plan';
import type { PlanDataset } from '../types/simulation';
import type { Tag } from '../types/tags';
import type { TimeRange } from '../types/timeline';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Writeable. */

export const activityEditingLocked: Writable<boolean> = writable(false);

export const planReadOnlySnapshot: Writable<boolean> = writable(false);

// Used to lock the plan if there's an active merge request.
export const planReadOnlyMergeRequest: Writable<boolean> = writable(false);

export const planReadOnly: Readable<boolean> = derived(
  [planReadOnlySnapshot, planReadOnlyMergeRequest],
  ([$planReadOnlySnapshot, $planReadOnlyMergeRequest]) => $planReadOnlyMergeRequest || $planReadOnlySnapshot,
);

export const createPlanError: Writable<string | null> = writable(null);

export const creatingPlan: Writable<boolean> = writable(false);

export const planEndTimeMs: Writable<number> = writable(0);

export const planStartTimeMs: Writable<number> = writable(0);

export const maxTimeRange: Writable<TimeRange> = writable({ end: 0, start: 0 });

export const viewTimeRange: Writable<TimeRange> = writable({ end: 0, start: 0 });

/* "plan" store dependencies */
export const initialPlan: Writable<Plan | null> = writable(null);

export const planId: Readable<number> = derived(initialPlan, $plan => ($plan ? $plan.id : -1));

export const planMetadata = gqlSubscribable<PlanMetadata | null>(gql.SUB_PLAN_METADATA, { planId }, null, null);

/* Derived. */

export const plan: Readable<Plan | null> = derived([initialPlan, planMetadata], ([$initialPlan, $planMetadata]) => {
  if (!$initialPlan) {
    return null;
  }
  return {
    ...$initialPlan,
    ...($planMetadata || {}),
  };
});

export const modelId: Readable<number> = derived(plan, $plan => ($plan ? $plan.model.id : -1));

/* Other Subscriptions. */

export const activityTypes = gqlSubscribable<ActivityType[]>(gql.SUB_ACTIVITY_TYPES, { modelId }, [], null);

export const planTags = gqlSubscribable<Tag[]>(gql.SUB_PLAN_TAGS, { planId }, [], null, ({ tags }) =>
  tags.map((tag: { tag: Tag }) => tag.tag),
);

export const planDatasets = gqlSubscribable<PlanDataset[] | null>(gql.SUB_PLAN_DATASET, { planId }, null, null);

export const planLocked = gqlSubscribable<boolean>(
  gql.SUB_PLAN_LOCKED,
  { planId },
  false,
  null,
  ({ is_locked }) => is_locked,
);

export const planMergeRequestsIncoming = gqlSubscribable<PlanMergeRequest[]>(
  gql.SUB_PLAN_MERGE_REQUESTS_INCOMING,
  { planId },
  [],
  null,
  (planMergeRequests: PlanMergeRequestSchema[]): PlanMergeRequest[] =>
    planMergeRequests.map(planMergeRequest => ({ ...planMergeRequest, pending: false, type: 'incoming' })),
);

export const planMergeRequestsOutgoing = gqlSubscribable<PlanMergeRequest[]>(
  gql.SUB_PLAN_MERGE_REQUESTS_OUTGOING,
  { planId },
  [],
  null,
  (planMergeRequests: PlanMergeRequestSchema[]): PlanMergeRequest[] =>
    planMergeRequests.map(planMergeRequest => ({ ...planMergeRequest, pending: false, type: 'outgoing' })),
);

export const planRevision = gqlSubscribable<number>(
  gql.SUB_PLAN_REVISION,
  { planId },
  -1,
  null,
  ({ revision }: Pick<Plan, 'revision'>) => revision,
);

/* Helper Functions. */

export function resetPlanStores() {
  activityEditingLocked.set(false);
  createPlanError.set(null);
  creatingPlan.set(false);
  initialPlan.set(null);
  planEndTimeMs.set(0);
  planStartTimeMs.set(0);
  maxTimeRange.set({ end: 0, start: 0 });
  viewTimeRange.set({ end: 0, start: 0 });
}

export function setActivityEditingLocked(locked: boolean) {
  activityEditingLocked.set(locked);
}
