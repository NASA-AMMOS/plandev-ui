import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RouterState } from '../app-routing.module';
import { RootState } from '../app-store';

export const getRouterState = createFeatureSelector<
  RootState,
  { state: RouterState }
>('router');

export const getState = createSelector(getRouterState, data =>
  data ? data.state : null,
);

export const getPath = createSelector(getState, (state: RouterState) =>
  state ? state.path : null,
);
