import { derived, writable, type Readable, type Writable } from 'svelte/store';
import gql from '../utilities/gql';
import type { Status } from '../utilities/status';
import { modelId, planId } from './plan';
import { gqlSubscribable } from './subscribable';

/* Subscriptions. */

export const simulation = gqlSubscribable<Simulation | null>(
  gql.SUB_SIMULATION,
  { planId },
  null,
  (simulations: Simulation[]) => simulations[0],
);

export const simulationTemplates = gqlSubscribable<SimulationTemplate[]>(gql.SUB_SIM_TEMPLATES, { modelId }, []);

/* Writeable. */

export const modelParametersMap: Writable<ParametersMap> = writable({});

export const simulationStatus: Writable<Status | null> = writable(null);

/* Derived. */

export const simulationDatasetId: Readable<number | null> = derived(simulation, $simulation => {
  if ($simulation) {
    return $simulation.datasets.length ? $simulation.datasets[0].id : null;
  }
  return null;
});

/* Helper Functions. */

export function resetSimulationStores() {
  modelParametersMap.set({});
  simulationStatus.set(null);
}
