import { derived, writable, type Readable, type Writable } from 'svelte/store';

/* Writeable. */

export const resourceSamplesMap: Writable<Record<string, ResourceValue[]>> = writable({});

export const resourceTypes: Writable<ResourceType[]> = writable([]);

/* Derived. */

export const resourceTypesMap: Readable<Record<string, ValueSchema>> = derived(resourceTypes, $resourceTypes =>
  $resourceTypes.reduce((map: Record<string, ValueSchema>, { name, schema }) => {
    map[name] = schema;
    return map;
  }, {}),
);

export const resources: Readable<Resource[]> = derived(
  [resourceSamplesMap, resourceTypesMap],
  ([$resourceSamplesMap, $resourceTypesMap]) =>
    Object.entries($resourceSamplesMap).map(([name, values]) => ({
      name,
      schema: $resourceTypesMap[name],
      values,
    })),
);

/* Helper Functions. */

export function resetResourceStores() {
  resourceSamplesMap.set({});
  resourceTypes.set([]);
}
