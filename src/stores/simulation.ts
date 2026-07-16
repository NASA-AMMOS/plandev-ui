import { keyBy } from 'lodash-es';
import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { Status } from '../enums/status';
import type {
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
import { planDatasets, planId, planModelId, planModelRevision, planRevision } from './plan';
import { gqlSubscribable } from './subscribable';

/* Writeable. */

export const simulationDatasetId: Writable<number> = writable(-1);

export const externalResourceNames: Writable<string[]> = writable([]);

export const resourceTypes: Writable<ResourceType[]> = writable([]);

export const resourceTypesLoading: Writable<boolean> = writable(true);

export const spans: Writable<Span[] | null> = writable(null);

export const initialSpansLoading: Writable<boolean> = writable(true);

export const yAxesWithScaleDomainsCache: Writable<Record<number, Axis[]>> = writable({});

export const simulationEvents: Writable<SimulationEvent[] | null> = writable(null);

/* Subscriptions. */

export const simulation = gqlSubscribable<Simulation | null>(
  gql.SUB_SIMULATION,
  { planId },
  null,
  (simulations: Simulation[]): Simulation => simulations[0],
);

export const simulationDataset = gqlSubscribable<SimulationDataset | null>(
  gql.SUB_SIMULATION_DATASET,
  { simulationDatasetId },
  null,
);

export const simulationDatasetLatest = gqlSubscribable<SimulationDataset | null>(
  gql.SUB_SIMULATION_DATASET_LATEST,
  { planId },
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
  v => v[0]?.simulation_datasets || [],
);

export const simulationDatasetsAll = gqlSubscribable<SimulationDatasetSlim[]>(
  gql.SUB_SIMULATION_DATASETS_ALL,
  null,
  [],
);

export const simulationTemplates = gqlSubscribable<SimulationTemplate[]>(
  gql.SUB_SIMULATION_TEMPLATES,
  { modelId: planModelId },
  [],
);

export const selectedSpanId: Writable<SpanId | null> = writable(null);

export const selectedSimulationEventId: Writable<number | null> = writable(null);

/* Derived. */

export const allResourceTypes: Readable<ResourceType[]> = derived(
  [resourceTypes, planDatasets, simulationDatasetId],
  ([$resourceTypes, $planDatasets, $simulationDatasetId]) => {
    const seen = new Set<string>();
    const out: ResourceType[] = [];
    // Add resource types from the model
    for (const { name, schema } of $resourceTypes) {
      if (!seen.has(name)) {
        seen.add(name);
        out.push({ name, schema });
      }
    }
    // Add resource types from datasets tied to the current sim or untied to any sim (plan-level).
    for (const planDataset of $planDatasets) {
      const tiedToOtherSim =
        planDataset.simulation_dataset_id !== null && planDataset.simulation_dataset_id !== $simulationDatasetId;
      if (tiedToOtherSim) {
        continue;
      }
      for (const profile of planDataset.dataset.profiles) {
        if (!seen.has(profile.name)) {
          seen.add(profile.name);
          out.push({ name: profile.name, schema: profile.type.schema });
        }
      }
    }
    return out;
  },
);

export const spansMap: Readable<SpansMap | null> = derived(spans, $spans => (!spans ? null : keyBy($spans, 'span_id')));

export const spanUtilityMaps: Readable<SpanUtilityMaps> = derived(spans, $spans => {
  return createSpanUtilityMaps($spans || []);
});

export const simulationStatus: Readable<Status | null> = derived(
  [planRevision, simulationDatasetLatest, simulation, planModelRevision],
  ([$planRevision, $simulationDataset, $simulation, $planModelRevision]) => {
    if ($simulationDataset && $simulation && $planModelRevision > -1) {
      const { status } = $simulationDataset;

      if (
        $planRevision !== $simulationDataset.plan_revision ||
        $simulation.revision !== $simulationDataset.simulation_revision ||
        $planModelRevision !== $simulationDataset.model_revision
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
  if ($selectedSpanId !== null && $spansMap !== null) {
    return $spansMap[$selectedSpanId] || null;
  }

  return null;
});

export const simulationDatasetLatestId = derived(
  [simulationDatasetLatest],
  ([$simulationDatasetLatest]) => $simulationDatasetLatest?.id ?? -1,
);

/* Helper Functions. */

export function resetSimulationStores() {
  externalResourceNames.set([]);
  initialSpansLoading.set(true);
  selectedSpanId.update(() => null);
  simulation.updateValue(() => null);
  simulationDatasetId.set(-1);
  simulationDataset.updateValue(() => null);
  simulationDatasetLatest.updateValue(() => null);
  simulationEvents.set(null);
  simulationTemplates.updateValue(() => []);
  simulationDatasetsPlan.updateValue(() => []);
  simulationDatasetsAll.updateValue(() => []);
  spans.set(null);
  resourceTypes.set([]);
}
