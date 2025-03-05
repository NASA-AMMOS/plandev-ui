import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ActivityType } from '../types/activity';
import type { PlanMergeRequest, PlanMergeRequestSchema, PlanMetadata } from '../types/plan';
import type { PlanDataset } from '../types/simulation';
import type { Tag } from '../types/tags';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Writeable. */

export const activityEditingLocked: Writable = writable(false);

export const planReadOnlySnapshot: Writable = writable(false);

// Used to lock the plan if there's an active merge request.
export const planReadOnlyMergeRequest: Writable = writable(false);

export const planReadOnly: Readable = derived(
  [planReadOnlySnapshot, planReadOnlyMergeRequest],
  ([$planReadOnlySnapshot, $planReadOnlyMergeRequest]) => $planReadOnlyMergeRequest || $planReadOnlySnapshot,
);

export const createPlanError: Writable = writable(null);

export const creatingPlan: Writable = writable(false);

export const planEndTimeMs: Writable = writable(0);

export const planStartTimeMs: Writable = writable(0);

export const maxTimeRange: Writable = writable({ end: 0, start: 0 });

export const viewTimeRange: Writable = writable({ end: 0, start: 0 });

/* "plan" store dependencies */
export const initialPlan: Writable = writable(null);

export const planId: Readable = derived(initialPlan, $plan => ($plan ? $plan.id : -1));

export const planMetadata = gqlSubscribable<PlanMetadata | null>(gql.SUB_PLAN_METADATA, { planId }, null, null);

/* Derived. */

export const plan: Readable = derived([initialPlan, planMetadata], ([$initialPlan, $planMetadata]) => {
  if (!$initialPlan) {
    return null;
  }
  return {
    ...$initialPlan,
    ...($planMetadata || {}),
  };
});

export const modelId: Readable = derived(plan, $plan => ($plan ? $plan.model.id : -1));

/* Other Subscriptions. */

export const activityTypes = gqlSubscribable<ActivityType[]>(gql.SUB_ACTIVITY_TYPES, { modelId }, [], null);

export const subsystemTags: Readable = derived(activityTypes, $activityTypes => {
  const seenSubsystems: Record = {};
  return $activityTypes.reduce((subsystems: Tag[], activityType) => {
    if (activityType.subsystem_tag && !seenSubsystems[activityType.subsystem_tag.id]) {
      seenSubsystems[activityType.subsystem_tag.id] = true;
      subsystems.push(activityType.subsystem_tag);
    }
    return subsystems;
  }, []);
});

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
  ({ revision }: Pick) => revision,
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
