import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';

/* Data. */

export enum SchedulingStatus {
  Clean = 'Clean',
  Complete = 'Complete',
  Executing = 'Executing',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

/* Stores. */

export const schedulingStatus: Writable<SchedulingStatus> = writable(
  SchedulingStatus.Clean,
);
