import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { PlanSnapshot } from '../types/plan-snapshot';
import gql from '../utilities/gql';
import { planId } from './plan';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const planSnapshots = gqlSubscribable<PlanSnapshot[]>(gql.SUB_PLAN_SNAPSHOTS, { planId }, [], null);

/* Writeable. */

export const planSnapshotId: Writable<number | null> = writable(null);

/* Derived. */

export const planSnapshot: Readable<PlanSnapshot | null> = derived(
  [planSnapshots, planSnapshotId],
  ([$planSnapshots, $planSnapshotId]) => {
    const selectedPlanSnapshot = $planSnapshots.find(snapshot => {
      return snapshot.snapshot_id === $planSnapshotId;
    });

    return selectedPlanSnapshot ?? null;
  },
);
