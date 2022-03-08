import type { Writable } from 'svelte/store';
import { writable } from 'svelte/store';
import Toastify from 'toastify-js';
import { Status } from '../utilities/enums';
import gql from '../utilities/gql';
import req from '../utilities/requests';
import { getGqlSubscribable } from './subscribable';

/* Stores. */

export const modelParametersMap: Writable<ParametersMap> = writable({});

export const simulation: Writable<Simulation | null> = writable(null);

export const simulationStatus = (() => {
  const {
    set,
    subscribe,
    update: updateStore,
  } = writable<Status>(Status.Clean);

  return {
    set,
    subscribe,
    update(newStatus: Status) {
      updateStore(currentStatus => {
        switch (currentStatus) {
          case Status.Clean:
            if (newStatus === Status.Dirty) {
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
  gql.SUB_SIM_TEMPLATES,
  { modelId: -1 },
  [],
);

/* Utility Functions. */

export async function updateSimulation(
  newSimulation: Simulation,
  newFiles: File[] = [],
): Promise<void> {
  try {
    const updatedSimulation = await req.updateSimulation(newSimulation);
    await req.uploadFiles(newFiles);
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
