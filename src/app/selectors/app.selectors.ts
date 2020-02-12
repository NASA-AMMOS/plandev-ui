import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppState } from '../reducers/app.reducer';

const getAppState = createFeatureSelector<AppState>('app');

export const getLoading = createSelector(
  getAppState,
  (state: AppState): boolean => state.loading,
);
