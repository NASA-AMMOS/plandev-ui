import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import Toastify from 'toastify-js';
import type { ParametersMap, Simulation, SimulationTemplate } from '../types';
import { SUB_SIM_TEMPLATES } from '../utilities/gql';
import { reqUpdateSimulation, reqUploadFiles } from '../utilities/requests';
import { getGqlSubscribable } from './subscribable';

/* Data. */

export enum SimulationStatus {
  Clean = 'Clean',
  Complete = 'Complete',
  Dirty = 'Dirty',
  Executing = 'Executing',
  Failed = 'Failed',
  Incomplete = 'Incomplete',
  Unknown = 'Unknown',
}

/* Stores. */

export const modelParametersMap: Writable<ParametersMap> = writable({});

export const simulation: Writable<Simulation | null> = writable(null);

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

export const simulationTemplates = getGqlSubscribable<SimulationTemplate[]>(
  SUB_SIM_TEMPLATES,
  { modelId: -1 },
  [],
);

/* Utility Functions. */

export async function updateSimulation(
  newSimulation: Simulation,
  newFiles: File[],
): Promise<void> {
  try {
    const updatedSimulation = await reqUpdateSimulation(newSimulation);
    await reqUploadFiles(newFiles);
    simulation.set(updatedSimulation);
    Toastify({
      backgroundColor: '#2da44e',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Simulation Updated Successfully',
    }).showToast();
  } catch (e) {
    console.log(e);
    Toastify({
      backgroundColor: '#a32a2a',
      duration: 3000,
      gravity: 'bottom',
      position: 'left',
      text: 'Simulation Update Failed',
    }).showToast();
  }
}
