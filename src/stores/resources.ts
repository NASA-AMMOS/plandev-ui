import { writable, type Writable } from 'svelte/store';

/* Writeable. */

export const resources: Writable<Resource[]> = writable([]);

/* Helper Functions. */

export function resetResourceStores() {
  resources.set([]);
}
