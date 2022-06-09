import { derived, writable, type Readable, type Writable } from 'svelte/store';

/* Writeable. */

export const resources: Writable<Resource[]> = writable([]);

export const resourceTypes: Writable<ResourceType[]> = writable([]);

/* Derived. */

export const resourceTypesMap: Readable<Record<string, ValueSchema>> = derived(resourceTypes, $resourceTypes =>
  $resourceTypes.reduce((map: Record<string, ValueSchema>, { name, schema }) => {
    map[name] = schema;
    return map;
  }, {}),
);

/* Helper Functions. */

export function resetResourceStores() {
  resources.set([]);
  resourceTypes.set([]);
}
