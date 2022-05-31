import { writable, type Writable } from 'svelte/store';

/* Stores. */

export const resources: Writable<Resource[]> = writable([]);

/* Helper Functions. */

export function resetResourceStores() {
  resources.set([]);
}
