import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';

/* Stores. */

export const resources: Writable<Resource[]> = writable([]);

/* Action Functions. */

export const resourceActions = {
  reset(): void {
    resources.set([]);
  },
};
