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

export const planMetadata = gqlSubscribable<PlanMetadata | null>(gql.SUB_PLAN_METADATA, { planId }, null);

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

export const planModelId: Readable<number> = derived(plan, $plan => $plan?.model?.id ?? -1);

export const planModelRevision: Readable<number> = derived(plan, $plan => $plan?.model?.revision ?? -1);

export const planRevision: Readable<number> = derived(plan, $plan => $plan?.revision ?? -1);

/* Other Subscriptions. */

export const planModelActivityTypes = gqlSubscribable<ActivityType[]>(
  gql.SUB_ACTIVITY_TYPES,
  { modelId: planModelId },
  [],
);

export const subsystemTags: Readable<Tag[]> = derived(planModelActivityTypes, $planModelActivityTypes => {
  const seenSubsystems: Record<number, boolean> = {};
  return $planModelActivityTypes.reduce((subsystems: Tag[], activityType) => {
    if (activityType.subsystem_tag && !seenSubsystems[activityType.subsystem_tag.id]) {
      seenSubsystems[activityType.subsystem_tag.id] = true;
      subsystems.push(activityType.subsystem_tag);
    }
    return subsystems;
  }, []);
});

export const planTags = gqlSubscribable<Tag[]>(gql.SUB_PLAN_TAGS, { planId }, [], ({ tags }) =>
  tags.map((tag: { tag: Tag }) => tag.tag),
);

export const planDatasets = gqlSubscribable<PlanDataset[]>(gql.SUB_PLAN_DATASET, { planId }, []);

export const planLocked = gqlSubscribable<boolean>(
  gql.SUB_PLAN_LOCKED,
  { planId },
  false,
  ({ is_locked }) => is_locked,
);

export const planMergeRequestsIncoming = gqlSubscribable<PlanMergeRequest[]>(
  gql.SUB_PLAN_MERGE_REQUESTS_INCOMING,
  { planId },
  [],
  (planMergeRequests: PlanMergeRequestSchema[]): PlanMergeRequest[] =>
    planMergeRequests.map(planMergeRequest => ({ ...planMergeRequest, pending: false, type: 'incoming' })),
);

export const planMergeRequestsOutgoing = gqlSubscribable<PlanMergeRequest[]>(
  gql.SUB_PLAN_MERGE_REQUESTS_OUTGOING,
  { planId },
  [],
  (planMergeRequests: PlanMergeRequestSchema[]): PlanMergeRequest[] =>
    planMergeRequests.map(planMergeRequest => ({ ...planMergeRequest, pending: false, type: 'outgoing' })),
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
