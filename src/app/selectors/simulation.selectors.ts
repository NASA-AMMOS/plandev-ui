import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SimulationState } from '../reducers/simulation.reducer';
import { Band } from '../types';

export const getSimulationState = createFeatureSelector<SimulationState>(
  'simulation',
);

export const getSimulationRunning = createSelector(
  getSimulationState,
  (state: SimulationState): boolean => state.running,
);

export const getStateBands = createSelector(
  getSimulationState,
  (state: SimulationState): Band[] | null =>
    state.stateBands ? Object.values(state.stateBands) : null,
);
