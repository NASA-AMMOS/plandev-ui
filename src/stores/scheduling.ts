import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import { ExecutionStatus } from '../utilities/enums';

export const schedulingStatus: Writable<ExecutionStatus> = writable(
  ExecutionStatus.Clean,
);
