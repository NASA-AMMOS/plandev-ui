import { writable, Writable } from 'svelte/store';

export const plan: Writable<Plan | null> = writable(null);

export const planEndTimeMs: Writable<number> = writable(0);

export const planStartTimeMs: Writable<number> = writable(0);

export const maxTimeRange: Writable<TimeRange> = writable({ end: 0, start: 0 });

export const viewTimeRange: Writable<TimeRange> = writable({
  end: 0,
  start: 0,
});
