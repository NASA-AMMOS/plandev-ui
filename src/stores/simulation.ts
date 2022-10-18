import { derived, writable, type Readable, type Writable } from 'svelte/store';
import gql from '../utilities/gql';
import { sampleProfiles } from '../utilities/resources';
import { Status } from '../utilities/status';
import { modelId, plan, planId, planRevision } from './plan';
import { gqlSubscribable } from './subscribable';
import { view } from './views';

/* Writeable. */

export const modelParametersMap: Writable<ParametersMap> = writable({});

export const simulationDatasetId: Writable<number> = writable(-1);

/* Subscriptions. */

export const externalResources = gqlSubscribable<Resource[]>(
  gql.SUB_PROFILES_EXTERNAL,
  { planId },
  [],
  (data: ProfilesExternalResponse) => {
    const { datasets, duration, start_time } = data;
    let resources: Resource[] = [];

    for (const dataset of datasets) {
      const {
        dataset: { profiles },
        offset_from_plan_start,
      } = dataset;
      const sampledResources: Resource[] = sampleProfiles(profiles, start_time, duration, offset_from_plan_start);
      resources = [...resources, ...sampledResources];
    }

    return resources;
  },
);

export const simulation = gqlSubscribable<Simulation>(
  gql.SUB_SIMULATION,
  { planId },
  null,
  (simulations: Simulation[]): Simulation => simulations[0],
);

export const simulationDataset = gqlSubscribable<SimulationDataset | null>(
  gql.SUB_SIMULATION_DATASET,
  { planId, simulationDatasetId },
  null,
  (simulations: { simulation_datasets: SimulationDataset[] }[]): SimulationDataset => {
    if (simulations.length) {
      const [simulation] = simulations;
      const { simulation_datasets } = simulation;

      if (simulation_datasets.length) {
        const [simulation_dataset] = simulation_datasets;
        return simulation_dataset;
      }
    }
    return null;
  },
);

export const simulationDatasetIds = gqlSubscribable<number[]>(
  gql.SUB_SIMULATION_DATASET_IDS,
  { planId },
  [],
  (simulations: { simulation_dataset_ids: { id: number }[] }[]): number[] => {
    if (simulations.length) {
      return simulations[0].simulation_dataset_ids.map(({ id }) => id);
    }
    return [];
  },
);

export const simulationTemplates = gqlSubscribable<SimulationTemplate[]>(gql.SUB_SIMULATION_TEMPLATES, { modelId }, []);

/* Derived. */

export const simulationResources: Readable<Resource[]> = derived(
  [plan, simulationDataset],
  ([$plan, $simulationDataset]) => {
    if ($plan) {
      const { duration, start_time } = $plan;

      if ($simulationDataset) {
        const { dataset } = $simulationDataset;

        if (dataset) {
          const { profiles } = dataset;
          return sampleProfiles(profiles, start_time, duration);
        }
      }
    }

    return [];
  },
  [],
);

export const simulationSpans: Readable<Span[]> = derived(
  simulationDataset,
  $simulationDataset => {
    if ($simulationDataset) {
      const { dataset } = $simulationDataset;

      if (dataset) {
        const { spans } = dataset;
        return spans;
      }
    }

    return [];
  },
  [],
);

export const resourcesByViewLayerId: Readable<Record<number, Resource[]>> = derived(
  [externalResources, simulationResources, view],
  ([$externalResources, $simulationResources, $view]) => {
    const resources: Resource[] = [...$externalResources, ...$simulationResources];
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
              const { name } = resourceFilter;
              const regExp = new RegExp(name);
              const includeResource = regExp.test(resource.name);

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
  },
);

export const simulationStatus: Readable<Status | null> = derived(
  [planRevision, simulationDataset],
  ([$planRevision, $simulationDataset]) => {
    if ($simulationDataset) {
      const { status } = $simulationDataset;

      if ($planRevision !== $simulationDataset.plan_revision) {
        return Status.Modified;
      }

      if (status === 'success') {
        return Status.Complete;
      } else if (status === 'failed') {
        return Status.Failed;
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

/* Helper Functions. */

export function resetSimulationStores() {
  externalResources.updateValue(() => []);
  modelParametersMap.set({});
  simulationDatasetId.set(-1);
  simulationDataset.updateValue(() => null);
  simulationTemplates.updateValue(() => []);
  simulation.updateValue(() => null);
}
