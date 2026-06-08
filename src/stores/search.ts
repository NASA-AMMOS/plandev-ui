import { writable, type Writable } from 'svelte/store';
import type { ActivityDirectiveSearchResult } from '../types/activity';

export const PAGE_SIZE = 50;

/* Writeable. */
export const searchColumns: Writable<string> = writable('1fr 3px 4fr');

export const hasSearched: Writable<boolean> = writable(false);

export const searchResults: Writable<ActivityDirectiveSearchResult[] | null> = writable(null);

export const searchTotalCount: Writable<number> = writable(0);

export const searchCurrentPage: Writable<number> = writable(0);

export const searchOrderBy: Writable<Record<string, string>[]> = writable([{ last_modified_at: 'desc' }]);

export const isSearching: Writable<boolean> = writable(false);

export const searchRunId: Writable<number> = writable(0);
