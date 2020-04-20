import { createReducer, on } from '@ngrx/store';
import keyBy from 'lodash-es/keyBy';
import { SimulationActions } from '../actions';
import { simulationResultsToBands } from '../functions';
import { Band, StringTMap } from '../types';

export interface SimulationState {
  stateBands: StringTMap<Band> | null;
}

export const initialState: SimulationState = {
  stateBands: null,
};

export const reducer = createReducer(
  initialState,
  on(SimulationActions.clear, state => ({
    ...state,
    stateBands: null,
  })),
  on(SimulationActions.runSuccess, (state, action) => {
    const bands = simulationResultsToBands(action.results);
    return { ...state, stateBands: keyBy(bands, 'id') };
  }),
);
