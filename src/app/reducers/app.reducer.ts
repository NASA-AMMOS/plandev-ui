import { createReducer, on } from '@ngrx/store';
import { AppActions } from '../actions';

export interface AppState {
  loading: boolean;
}

export const initialState: AppState = {
  loading: false,
};

export const reducer = createReducer(
  initialState,
  on(AppActions.setLoading, (state, { loading }) => ({
    ...state,
    loading,
  })),
);
