import { keyBy } from 'lodash-es';
import type { Readable, Writable } from 'svelte/store';
import { derived, writable } from 'svelte/store';

/* Stores. */

export const plan: Writable<Plan | null> = writable(null);

export const activityTypesMap: Readable<ActivityTypesMap> = derived(plan, $plan => {
  if ($plan) {
    return keyBy($plan.model.activityTypes, 'name');
  }
  return {};
});

export const planEndTimeMs: Writable<number> = writable(0);

export const planStartTimeMs: Writable<number> = writable(0);

export const maxTimeRange: Writable<TimeRange> = writable({ end: 0, start: 0 });

export const viewTimeRange: Writable<TimeRange> = writable({
  end: 0,
  start: 0,
});

/* Helper Functions. */

export function resetPlanStores() {
  plan.set(null);
  planEndTimeMs.set(0);
  planStartTimeMs.set(0);
  maxTimeRange.set({ end: 0, start: 0 });
  viewTimeRange.set({ end: 0, start: 0 });
}
