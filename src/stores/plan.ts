import { writable, Writable } from 'svelte/store';

export const plan: Writable<Plan | null> = writable(null);
