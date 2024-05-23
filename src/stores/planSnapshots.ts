import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { ActivityDirectiveDB } from '../types/activity';
import type { PlanSnapshot } from '../types/plan-snapshot';
import gql from '../utilities/gql';
import { planId } from './plan';
import { simulationDatasetsPlan } from './simulation';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const planSnapshots = gqlSubscribable<PlanSnapshot[]>(gql.SUB_PLAN_SNAPSHOTS, { planId }, [], null);

/* Writeable. */

export const planSnapshotActivityDirectives: Writable<ActivityDirectiveDB[]> = writable([]);

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

export const planSnapshotsWithSimulations: Readable<PlanSnapshot[]> = derived(
  [planSnapshots, simulationDatasetsPlan],
  ([$planSnapshots, $simulationDatasetsPlan]) => {
    return $planSnapshots.map(planSnapshot => {
      const latestPlanSnapshotSimulation = $simulationDatasetsPlan.find(simulation => {
        return simulation.plan_revision === planSnapshot?.revision;
      });
      return { ...planSnapshot, simulation: latestPlanSnapshotSimulation || null };
    });
  },
);

/* Helper Functions. */

export function resetPlanSnapshotStores() {
  planSnapshots.updateValue(() => []);
  planSnapshotActivityDirectives.set([]);
  planSnapshotId.set(null);
}
