import { writable, type Writable } from 'svelte/store';
import gql from '../utilities/gql';
import { Status } from '../utilities/status';
import { getGqlSubscribable } from './subscribable';

/* Subscriptions. */

export const simulation = getGqlSubscribable<Simulation | null>(
  gql.SUB_SIMULATION,
  { planId: -1 },
  null,
  (simulations: Simulation[]) => simulations[0],
);

export const simulationTemplates = getGqlSubscribable<SimulationTemplate[]>(gql.SUB_SIM_TEMPLATES, { modelId: -1 }, []);

/* Writeable. */

export const modelParametersMap: Writable<ParametersMap> = writable({});

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

/* Helper Functions. */

export function resetSimulationStores() {
  modelParametersMap.set({});
  simulationStatus.set(Status.Clean);
}
