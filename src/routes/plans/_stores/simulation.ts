import { writable } from 'svelte/store';
import { SimulationStatus } from '../../../types';

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
