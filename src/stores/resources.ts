import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';

export const resources: Writable<Resource[]> = writable([]);
