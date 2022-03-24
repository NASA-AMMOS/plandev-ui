import type { Writable } from 'svelte/store';
import { get, writable } from 'svelte/store';
import Toastify from 'toastify-js';
import { plan } from '../stores/plan';
import { Status } from '../utilities/enums';
import { sleep } from '../utilities/generic';
import gql from '../utilities/gql';
import req from '../utilities/requests';
import { offsetViolationWindows } from '../utilities/violations';
import { activitiesMap } from './activities';
import { violations } from './constraints';
import { planStartTimeMs } from './plan';
import { resources } from './resources';
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

/* Action Functions. */

export const simulationActions = {
  reset(): void {
    modelParametersMap.set({});
    simulation.set(null);
    simulationStatus.set(Status.Clean);
  },

  async runSimulation(): Promise<void> {
    const { id: planId, model } = get(plan);

    let tries = 0;
    simulationStatus.update(Status.Executing);

    do {
      const {
        activitiesMap: newActivitiesMap,
        constraintViolations,
        status,
        resources: newResources,
      } = await req.simulate(model.id, planId);

      if (status === 'complete') {
        activitiesMap.set(newActivitiesMap);
        resources.set(newResources);
        violations.set(
          offsetViolationWindows(
            constraintViolations,
            get<number>(planStartTimeMs),
          ),
        );
        simulationStatus.update(Status.Complete);
        return;
      } else if (status === 'failed') {
        simulationStatus.update(Status.Failed);
        return;
      } else if (status === 'incomplete') {
        simulationStatus.update(Status.Executing);
      } else if (status === 'pending') {
        simulationStatus.update(Status.Pending);
      }

      await sleep();
      ++tries;
    } while (tries < 10); // Trying a max of 10 times.

    simulationStatus.update(Status.Incomplete);
  },

  async updateSimulation(
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
  },
};
