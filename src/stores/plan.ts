import { keyBy } from 'lodash-es';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { compare } from '../utilities/generic';
import gql from '../utilities/gql';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const models = gqlSubscribable<ModelList[]>(gql.SUB_MODELS, {}, []);

/* Writeable. */

export const creatingModel: Writable<boolean> = writable(false);

export const createModelError: Writable<string | null> = writable(null);

export const createPlanError: Writable<string | null> = writable(null);

export const creatingPlan: Writable<boolean> = writable(false);

export const plan: Writable<Plan | null> = writable(null);

export const planEndTimeMs: Writable<number> = writable(0);

export const planStartTimeMs: Writable<number> = writable(0);

export const maxTimeRange: Writable<TimeRange> = writable({ end: 0, start: 0 });

export const viewTimeRange: Writable<TimeRange> = writable({ end: 0, start: 0 });

/* Derived. */

export const activityTypesMap: Readable<ActivityTypesMap> = derived(plan, $plan => {
  if ($plan) {
    return keyBy($plan.model.activity_types, 'name');
  }
  return {};
});

export const sortedModels: Readable<ModelList[]> = derived(models, $models => {
  if ($models) {
    return $models.sort((a, b) => compare(a.name, b.name));
  }
  return [];
});

/* Helper Functions. */

export function resetPlanStores() {
  creatingModel.set(false);
  createModelError.set(null);
  createPlanError.set(null);
  creatingPlan.set(false);
  plan.set(null);
  planEndTimeMs.set(0);
  planStartTimeMs.set(0);
  maxTimeRange.set({ end: 0, start: 0 });
  viewTimeRange.set({ end: 0, start: 0 });
}
