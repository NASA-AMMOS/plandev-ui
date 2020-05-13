import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SimulationState } from '../reducers/simulation.reducer';
import { Band, Guide } from '../types';
import { getGuides } from './guide.selectors';

export const getSimulationState = createFeatureSelector<SimulationState>(
  'simulation',
);

export const getSimulationRunning = createSelector(
  getSimulationState,
  (state: SimulationState): boolean => state.running,
);

export const getStateBands = createSelector(
  getSimulationState,
  getGuides,
  (state: SimulationState, guides: Guide[]): Band[] | null => {
    if (state.stateBands) {
      return Object.values(state.stateBands).map(band => ({
        ...band,
        horizontalGuides: guides.filter(guide => guide.bandId === band.id),
      }));
    }
    return null;
  },
);
