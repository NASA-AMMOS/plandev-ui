import { createReducer, on } from '@ngrx/store';
import keyBy from 'lodash-es/keyBy';
import { SimulationActions } from '../actions';
import { simulationResultsToBands } from '../functions';
import { Band, StringTMap } from '../types';

export interface SimulationState {
  running: boolean;
  stateBands: StringTMap<Band> | null;
}

export const initialState: SimulationState = {
  running: false,
  stateBands: null,
};

export const reducer = createReducer(
  initialState,
  on(SimulationActions.run, state => ({
    ...state,
    running: true,
    stateBands: null,
  })),
  on(SimulationActions.runFailure, state => ({
    ...state,
    running: false,
  })),
  on(SimulationActions.runSuccess, (state, action) => {
    const bands = simulationResultsToBands(action.results);
    return { ...state, running: false, stateBands: keyBy(bands, 'id') };
  }),
);
