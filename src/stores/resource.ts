import { writable, type Writable } from 'svelte/store';
import type { ResourceType } from '../types/simulation';

/* Writeable. */
export const resourceTypes: Writable<ResourceType[]> = writable([]);
