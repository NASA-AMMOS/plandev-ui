import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import type { Resource } from '../types';

export const resources: Writable<Resource[]> = writable([]);
