import { writable, type Writable } from 'svelte/store';
import type { ActivityDirectiveSearchResult } from '../types/activity';

/* Writeable. */
export const searchColumns: Writable<string> = writable('1fr 3px 1fr');

export const hasSearched: Writable<boolean> = writable(false);

export const searchResults: Writable<ActivityDirectiveSearchResult[] | null> = writable(null);
