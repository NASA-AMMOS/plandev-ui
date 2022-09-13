import { derived, writable, type Writable } from 'svelte/store';
import gql from '../utilities/gql';
import { sampleProfiles } from '../utilities/resources';
import { planId } from './plan';
import { gqlSubscribable } from './subscribable';

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

/* Writeable. */

export const simulationResources: Writable<Resource[]> = writable([]);

/* Derived. */

export const resources = derived(
  [externalResources, simulationResources],
  ([$externalResources, $simulationResources]) => {
    return [...$externalResources, ...$simulationResources];
  },
);

/* Helper Functions. */

export function resetResourceStores() {
  simulationResources.set([]);
}
