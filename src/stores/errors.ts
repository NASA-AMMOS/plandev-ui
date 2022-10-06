import { derived, writable, type Readable, type Writable } from 'svelte/store';
import { ErrorTypes } from '../utilities/errors';
import { simulationDataset } from './simulation';

export function parseErrorReason(error: string) {
  console.log(error);
  return error.replace(/\s*at\s(gov|com)/, ' : ').replace(/gov\S*:\s*(?<reason>[^:]+)\s*:(.|\s|\n|\t|\r)*/, '$1');
}

export const simulationDatasetErrors: Readable<SimulationDatasetError[]> = derived(
  [simulationDataset],
  ([$simulationDataset]) => {
    if ($simulationDataset) {
      const { reason } = $simulationDataset;

      if (reason) {
        const { errors, success }: SimulationDatasetReason = JSON.parse(reason);

        if (!success) {
          return Object.keys(errors).reduce((aggregatedErrors: SimulationDatasetError[], activityId: string) => {
            const { reason } = errors[activityId];
            return [
              ...aggregatedErrors,
              {
                reason: parseErrorReason(reason),
                sourceId: activityId,
                trace: reason,
                type: ErrorTypes.SIMULATION_DATASET,
              },
            ];
          }, [] as SimulationDatasetError[]);
        }
      }
    }

    return [];
  },
  [],
);

export const schedulingErrors: Writable<SchedulingError[]> = writable([]);

export const allErrors: Readable<BaseError[]> = derived(
  [simulationDatasetErrors, schedulingErrors],
  ([$simulationDatasetErrors, $schedulingErrors]) => [
    ...($simulationDatasetErrors ? $simulationDatasetErrors : []),
    ...($schedulingErrors ? $schedulingErrors : []),
  ],
);
