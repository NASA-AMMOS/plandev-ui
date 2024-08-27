import { keyBy } from 'lodash-es';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { Status } from '../enums/status';
import type {
  Resource,
  ResourceType,
  Simulation,
  SimulationDataset,
  SimulationDatasetSlim,
  SimulationEvent,
  SimulationTemplate,
  Span,
  SpanId,
  SpanUtilityMaps,
  SpansMap,
} from '../types/simulation';
import type { Axis } from '../types/timeline';
import { createSpanUtilityMaps } from '../utilities/activities';
import gql from '../utilities/gql';
import { getSimulationProgress } from '../utilities/simulation';
import { modelId, planId, planRevision } from './plan';
import { gqlSubscribable } from './subscribable';

/* Writeable. */

export const simulationDatasetId: Writable<number> = writable(-1);

export const externalResources: Writable<Resource[]> = writable([]);

export const externalResourceNames: Writable<string[]> = writable([]);

// default to true since we cannot differentiate between "ext resources have been initially fetched" and "fetching ext resources"
export const fetchingResourcesExternal: Writable<boolean> = writable(true);

export const resourceTypes: Writable<ResourceType[]> = writable([]);

export const resourceTypesLoading: Writable<boolean> = writable(true);

export const spans: Writable<Span[]> = writable([]);

export const yAxesWithScaleDomainsCache: Writable<Record<number, Axis[]>> = writable({});

export const simulationEvents: Writable<SimulationEvent[]> = writable([]);

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
  v => v[0]?.simulation_datasets || [],
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

export const selectedSimulationEventId: Writable<number | null> = writable(null);

/* Derived. */

export const spansMap: Readable<SpansMap> = derived(spans, $spans => keyBy($spans, 'span_id'));

export const spanUtilityMaps: Readable<SpanUtilityMaps> = derived(spans, $spans => {
  return createSpanUtilityMaps($spans);
});

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
      } else if ($simulationDataset.canceled) {
        return Status.Canceled;
      } else if (status === 'incomplete') {
        return Status.Incomplete;
      } else if (status === 'pending') {
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

export const simulationDatasetLatestId = derived(
  [simulationDatasetLatest],
  ([$simulationDatasetLatest]) => $simulationDatasetLatest?.dataset_id ?? -1,
);

/* Helper Functions. */

export function resetSimulationStores() {
  externalResources.set([]);
  externalResourceNames.set([]);
  fetchingResourcesExternal.set(false);
  selectedSpanId.update(() => null);
  simulation.updateValue(() => null);
  simulationDatasetId.set(-1);
  simulationDataset.updateValue(() => null);
  simulationDatasetLatest.updateValue(() => null);
  simulationEvents.set([]);
  simulationTemplates.updateValue(() => []);
  simulationDatasetsPlan.updateValue(() => []);
  simulationDatasetsAll.updateValue(() => []);
  spans.set([]);
  resourceTypes.set([]);
}
