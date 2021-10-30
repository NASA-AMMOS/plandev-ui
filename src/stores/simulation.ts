import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import Toastify from 'toastify-js';
import type { ArgumentsMap, ParametersMap } from '../types';
import { SimulationStatus } from '../types';
import {
  reqUpdateSimulationArguments,
  reqUploadFiles,
} from '../utilities/requests';

/* Stores. */

export const modelParametersMap: Writable<ParametersMap> = writable({});
export const selectedSimulationId: Writable<number | null> = writable(null);
export const simulationArgumentsMap: Writable<ArgumentsMap> = writable({});

export const simulationStatus = (() => {
  const {
    set,
    subscribe,
    update: updateStore,
  } = writable<SimulationStatus>(SimulationStatus.Clean);

  return {
    set,
    subscribe,
    update(newStatus: SimulationStatus) {
      updateStore(currentStatus => {
        switch (currentStatus) {
          case SimulationStatus.Clean:
            if (newStatus === SimulationStatus.Dirty) {
              return currentStatus;
            } else {
              return newStatus;
            }
          default:
            return newStatus;
        }
      });
    },
  };
})();

/* Utility Functions. */

export async function updateSimulationArguments(
  simulationId: number,
  argumentsMap: ArgumentsMap,
  newFiles: File[],
): Promise<void> {
  try {
    await reqUpdateSimulationArguments(simulationId, argumentsMap);
    await reqUploadFiles(newFiles);
    simulationArgumentsMap.set(argumentsMap);
    Toastify({
      backgroundColor: '#2da44e',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Arguments Updated Successfully',
    }).showToast();
  } catch (e) {
    console.log(e);
    Toastify({
      backgroundColor: '#a32a2a',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Arguments Update Failed',
    }).showToast();
  }
}
