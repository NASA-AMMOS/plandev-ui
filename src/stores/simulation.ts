import { writable, type Writable } from 'svelte/store';
import gql from '../utilities/gql';
import { Status } from '../utilities/status';
import { getGqlSubscribable } from './subscribable';

/* Stores. */

export const modelParametersMap: Writable<ParametersMap> = writable({});

export const simulation: Writable<Simulation | null> = writable(null);

export const simulationStatus = (() => {
  const { set, subscribe, update: updateStore } = writable<Status>(Status.Clean);

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

export const simulationTemplates = getGqlSubscribable<SimulationTemplate[]>(gql.SUB_SIM_TEMPLATES, { modelId: -1 }, []);

/* Helper Functions. */

export function resetSimulationStores() {
  modelParametersMap.set({});
  simulation.set(null);
  simulationStatus.set(Status.Clean);
}
