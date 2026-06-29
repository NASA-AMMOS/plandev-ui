import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ActivityType } from '../types/activity';
import type { Plan, PlanMergeRequest, PlanMergeRequestSchema, PlanMetadata } from '../types/plan';
import type { PlanDataset } from '../types/simulation';
import type { Tag } from '../types/tags';
import type { TimeRange } from '../types/timeline';
import gql from '../utilities/gql';
import { getDoyTime, getDoyTimeFromInterval, getUnixEpochTime } from '../utilities/time';
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

export const viewTimeRange: Writable<TimeRange> = writable({ end: 0, start: 0 });

// Display-only override of the plan's effective time bounds, used while previewing a plan snapshot
// taken at different bounds so activities (esp. plan-end-anchored) and the timeline render correctly.
// Null when not previewing (or for snapshots that predate stored bounds).
export const planBoundsPreviewOverride: Writable<{ duration: string; start_time: string } | null> = writable(null);

/* "plan" store dependencies */
export const initialPlan: Writable<Plan | null> = writable(null);

export const planId: Readable<number> = derived(initialPlan, $plan => ($plan ? $plan.id : -1));

export const planMetadata = gqlSubscribable<PlanMetadata | null>(gql.SUB_PLAN_METADATA, { planId }, null);

/* Derived. */

export const plan: Readable<Plan | null> = derived(
  [initialPlan, planMetadata, planBoundsPreviewOverride],
  ([$initialPlan, $planMetadata, $planBoundsPreviewOverride]) => {
    if (!$initialPlan) {
      return null;
    }

    const newPlan: Plan = {
      ...$initialPlan,
      ...($planMetadata || {}),
    };

    // While previewing a snapshot taken at different bounds, render against the snapshot's bounds.
    if ($planBoundsPreviewOverride) {
      newPlan.start_time = $planBoundsPreviewOverride.start_time;
      newPlan.duration = $planBoundsPreviewOverride.duration;
    }

    // Recompute start_time and start_time_doy since these may have changed in planMetadata update
    newPlan.start_time_doy = getDoyTime(new Date(newPlan.start_time));
    newPlan.end_time_doy = getDoyTimeFromInterval(newPlan.start_time, newPlan.duration);

    return newPlan;
  },
);

export const planModelId: Readable<number> = derived(plan, $plan => $plan?.model?.id ?? -1);

export const planModelRevision: Readable<number> = derived(plan, $plan => $plan?.model?.revision ?? -1);

export const planStartTimeYmd: Readable<string> = derived(plan, $plan => $plan?.start_time ?? '');

export const planEndTimeDoy: Readable<string> = derived(plan, $plan => $plan?.end_time_doy ?? '');

export const planStartTimeMs: Readable<number> = derived(plan, $plan =>
  $plan?.start_time_doy ? getUnixEpochTime($plan?.start_time_doy) : 0,
);

export const planEndTimeMs: Readable<number> = derived(plan, $plan =>
  $plan?.end_time_doy ? getUnixEpochTime($plan?.end_time_doy) : 0,
);

export const maxTimeRange: Readable<TimeRange> = derived(
  [planStartTimeMs, planEndTimeMs],
  ([$planStartTimeMs, $planEndTimeMs]) => ({
    end: $planEndTimeMs,
    start: $planStartTimeMs,
  }),
);

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

export const planRevision = gqlSubscribable<number>(
  gql.SUB_PLAN_REVISION,
  { planId },
  -1,
  ({ revision }: Pick<Plan, 'revision'>) => revision,
);

/* Helper Functions. */

export function resetPlanStores() {
  activityEditingLocked.set(false);
  createPlanError.set(null);
  creatingPlan.set(false);
  initialPlan.set(null);
  planBoundsPreviewOverride.set(null);
  viewTimeRange.set({ end: 0, start: 0 });
}

export function setActivityEditingLocked(locked: boolean) {
  activityEditingLocked.set(locked);
}
