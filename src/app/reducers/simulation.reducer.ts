import { createReducer, on } from '@ngrx/store';
import { SimulationActions } from '../actions';
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
  on(SimulationActions.runSuccess, (state, action) => ({
    ...state,
    stateBands: action.stateBands,
  })),
);
