import { writable } from 'svelte/store';
import type { User } from '../types/app';

export const user = writable<User | null>(null);

export const permissibleQueries = writable<Record<string, boolean> | null>(null);
