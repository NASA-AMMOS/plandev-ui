import { derived, writable, type Readable, type Writable } from 'svelte/store';
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

export const allErrors: Readable<BaseError[]> = derived(
  [simulationDatasetErrors, schedulingErrors],
  ([$simulationDatasetErrors, $schedulingErrors]) =>
    [...($simulationDatasetErrors ?? []), ...($schedulingErrors ?? [])].sort((errorA: BaseError, errorB: BaseError) =>
      compare(errorA.timestamp, errorB.timestamp, false),
    ),
);
