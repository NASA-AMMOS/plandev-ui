import { keyBy } from 'lodash-es';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type {
  Resource,
  ResourceType,
  Simulation,
  SimulationDataset,
  SimulationDatasetSlim,
  SimulationTemplate,
  Span,
  SpanId,
  SpanUtilityMaps,
  SpansMap,
} from '../types/simulation';
import { createSpanUtilityMaps } from '../utilities/activities';
import gql from '../utilities/gql';
import { getSimulationProgress } from '../utilities/simulation';
import { Status } from '../utilities/status';
import { modelId, planId, planRevision } from './plan';
import { gqlSubscribable } from './subscribable';
import { view } from './views';

/* Writeable. */

export const simulationDatasetId: Writable<number> = writable(-1);

export const externalResources: Writable<Resource[]> = writable([]);

export const resources: Writable<Resource[]> = writable([]);

export const fetchingResources: Writable<boolean> = writable(false);

export const resourceTypes: Writable<ResourceType[]> = writable([]);

export const spans: Writable<Span[]> = writable([]);

/* Subscriptions. */

export const simulation = gqlSubscribable<Simulation | null>(
  gql.SUB_SIMULATION,
  { planId },
  null,
  null,
  (simulations: Simulation[]): Simulation => simulations[0],
);

export const simulationDataset = gqlSubscribable<SimulationDataset | null>(
  gql.SUB_SIMULATION_DATASET,
  { simulationDatasetId },
  null,
  null,
);

export const simulationDatasetLatest = gqlSubscribable<SimulationDataset | null>(
  gql.SUB_SIMULATION_DATASET_LATEST,
  { planId },
  null,
  null,
  (simulations: { simulation_datasets: SimulationDataset[] }[]): SimulationDataset | null => {
    if (simulations.length && simulations[0].simulation_datasets.length) {
      return simulations[0].simulation_datasets[0];
    }
    return null;
  },
);

export const simulationDatasetsPlan = gqlSubscribable<SimulationDataset[]>(
  gql.SUB_SIMULATION_DATASETS,
  { planId },
  [],
  null,
  v => v[0]?.simulation_datasets,
);

export const simulationDatasetsAll = gqlSubscribable<SimulationDatasetSlim[]>(
  gql.SUB_SIMULATION_DATASETS_ALL,
  null,
  [],
  null,
);

export const simulationTemplates = gqlSubscribable<SimulationTemplate[]>(
  gql.SUB_SIMULATION_TEMPLATES,
  { modelId },
  [],
  null,
);

export const selectedSpanId: Writable<SpanId | null> = writable(null);

/* Derived. */

export const spansMap: Readable<SpansMap> = derived(spans, $spans => keyBy($spans, 'id'));

export const spanUtilityMaps: Readable<SpanUtilityMaps> = derived(spans, $spans => {
  return createSpanUtilityMaps($spans);
});

export const allResources: Readable<Resource[]> = derived(
  [externalResources, resources],
  ([$externalResources, $resources]) => [...$externalResources, ...$resources],
);

export const resourcesByViewLayerId: Readable<Record<number, Resource[]>> = derived(
  [externalResources, resources, view],
  ([$externalResources, $resources, $view]) => {
    if ($view) {
      const resources: Resource[] = [...$externalResources, ...$resources];
      const { definition } = $view;
      const { plan } = definition;
      const { timelines } = plan;
      const resourcesByViewLayerId: Record<number, Resource[]> = {};

      for (const resource of resources) {
        for (const timeline of timelines) {
          const { rows } = timeline;

          for (const row of rows) {
            const { layers } = row;

            for (const layer of layers) {
              const { filter } = layer;

              if (filter.resource !== undefined) {
                const { resource: resourceFilter } = filter;
                const { names } = resourceFilter;
                const includeResource = names.indexOf(resource.name) > -1;

                if (includeResource) {
                  if (resourcesByViewLayerId[layer.id] === undefined) {
                    resourcesByViewLayerId[layer.id] = [resource];
                  } else {
                    resourcesByViewLayerId[layer.id].push(resource);
                  }
                }
              }
            }
          }
        }
      }
      return resourcesByViewLayerId;
    }
    return {};
  },
);

export const simulationStatus: Readable<Status | null> = derived(
  [planRevision, simulationDatasetLatest, simulation],
  ([$planRevision, $simulationDataset, $simulation]) => {
    if ($simulationDataset && $simulation) {
      const { status } = $simulationDataset;

      if (
        $planRevision !== $simulationDataset.plan_revision ||
        $simulation.revision !== $simulationDataset.simulation_revision
      ) {
        return Status.Modified;
      }

      if (status === 'success') {
        return Status.Complete;
      } else if (status === 'failed') {
        return Status.Failed;
      } else if (status === 'incomplete') {
        return Status.Incomplete;
      } else if (status === 'pending') {
        if ($simulationDataset.canceled) {
          return Status.Canceled;
        }
        return Status.Pending;
      }
    }

    return null;
  },
  null,
);

export const simulationProgress: Readable<number> = derived(
  [simulationDatasetLatest, simulationStatus],
  ([$simulationDataset]) => {
    return getSimulationProgress($simulationDataset);
  },
  0,
);

export const enableSimulation: Readable<boolean> = derived(simulationStatus, $simulationStatus => {
  return $simulationStatus === Status.Modified || $simulationStatus === null;
});

export const selectedSpan = derived([spansMap, selectedSpanId], ([$spansMap, $selectedSpanId]) => {
  if ($selectedSpanId !== null) {
    return $spansMap[$selectedSpanId] || null;
  }

  return null;
});

/* Helper Functions. */

export function resetSimulationStores() {
  externalResources.set([]);
  resources.set([]);
  simulationDatasetId.set(-1);
  simulationDataset.updateValue(() => null);
  simulationTemplates.updateValue(() => []);
  simulation.updateValue(() => null);
  spans.set([]);
}
