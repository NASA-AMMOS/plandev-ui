import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ActivityType } from '../../types/activity';
import type { ModelSlim } from '../../types/model';
import type { Plan, PlanMergeRequest, PlanMetadata } from '../../types/plan';
import type { Tag } from '../../types/tags';
import type { TimeRange } from '../../types/timeline';

/* Writeable. */

export const activityEditingLocked: Writable<boolean> = writable(false);

export const creatingModel: Writable<boolean> = writable(false);

export const createModelError: Writable<string | null> = writable(null);

export const createPlanError: Writable<string | null> = writable(null);

export const creatingPlan: Writable<boolean> = writable(false);

export const planEndTimeMs: Writable<number> = writable(0);

export const planStartTimeMs: Writable<number> = writable(0);

export const maxTimeRange: Writable<TimeRange> = writable({ end: 0, start: 0 });

export const viewTimeRange: Writable<TimeRange> = writable({ end: 0, start: 0 });

/* "plan" store dependencies */
export const initialPlan: Writable<Plan | null> = writable(null);

export const planId: Readable<number> = derived(initialPlan, $plan => ($plan ? $plan.id : -1));

export const planMetadata = writable<PlanMetadata | null>(null);

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

export const modelId: Readable<number> = derived(initialPlan, $plan => ($plan ? $plan.model.id : -1));

/* Subscriptions. */

export const activityTypes = writable<ActivityType[]>([]);

export const planTags = writable<Tag[]>([]);

export const models = writable<ModelSlim[]>([]);

export const planLocked = writable<boolean>(false);

export const planMergeRequestsIncoming = writable<PlanMergeRequest[]>([]);

export const planMergeRequestsOutgoing = writable<PlanMergeRequest[]>([]);

export const planRevision = writable<number>(-1);

/* Helper Functions. */

export function resetPlanStores() {
  activityEditingLocked.set(false);
  creatingModel.set(false);
  createModelError.set(null);
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
