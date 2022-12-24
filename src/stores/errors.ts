import { derived, writable, type Readable, type Writable } from 'svelte/store';
import type { BaseError, CaughtError, SchedulingError, SimulationDatasetError } from '../types/errors';
import { ErrorTypes } from '../utilities/errors';
import { compare } from '../utilities/generic';
import { simulationDataset } from './simulation';

export function parseErrorReason(error: string) {
  return error.replace(/\s*at\s(gov|com)/, ' : ').replace(/gov\S*:\s*(?<reason>[^:]+)\s*:(.|\s|\n|\t|\r)*/, '$1');
}

export const simulationDatasetErrors: Readable<SimulationDatasetError[]> = derived(
  [simulationDataset],
  ([$simulationDataset]) => {
    return $simulationDataset && $simulationDataset.reason
      ? [
          {
            ...$simulationDataset.reason,
            message: parseErrorReason($simulationDataset.reason.message),
          },
        ]
      : [];
  },
  [],
);

export const schedulingErrors: Writable<SchedulingError[]> = writable([]);

const caughtErrors: Writable<CaughtError[]> = writable([]);

export const allErrors: Readable<BaseError[]> = derived(
  [simulationDatasetErrors, schedulingErrors, caughtErrors],
  ([$simulationDatasetErrors, $schedulingErrors, $caughtErrors]) =>
    [...($simulationDatasetErrors ?? []), ...($schedulingErrors ?? []), ...($caughtErrors ?? [])].sort(
      (errorA: BaseError, errorB: BaseError) => compare(errorA.timestamp, errorB.timestamp, false),
    ),
);

/* Helper Functions. */

export function catchError(error: string | Error, details?: string | Error, shouldLog: boolean = true): void {
  caughtErrors.update(errors => {
    errors.push({
      message: `${error}`,
      timestamp: `${new Date()}`,
      ...(details ? { trace: `${details}` } : {}),
      type: ErrorTypes.CAUGHT_ERROR,
    });
    return errors;
  });

  if (shouldLog) {
    console.log(details ?? error);
  }
}
