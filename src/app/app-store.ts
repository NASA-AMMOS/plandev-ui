import { InjectionToken } from '@angular/core';
import * as fromRouter from '@ngrx/router-store';
import {
  Action,
  ActionReducer,
  ActionReducerMap,
  MetaReducer,
} from '@ngrx/store';
import { environment } from 'src/environments/environment';
import {
  AppReducer,
  AuthReducer,
  PlanningReducer,
  SimulationReducer,
  TimelineReducer,
} from './reducers';

export interface RootState {
  app: AppReducer.AppState;
  auth: AuthReducer.AuthState;
  planning: PlanningReducer.PlanningState;
  router: fromRouter.RouterReducerState;
  simulation: SimulationReducer.SimulationState;
  timeline: TimelineReducer.TimelineState;
}

export const ROOT_REDUCERS = new InjectionToken<
  ActionReducerMap<RootState, Action>
>('Root reducers token', {
  factory: () => ({
    app: AppReducer.reducer,
    auth: AuthReducer.reducer,
    planning: PlanningReducer.reducer,
    router: fromRouter.routerReducer,
    simulation: SimulationReducer.reducer,
    timeline: TimelineReducer.reducer,
  }),
});

export function logger(
  reducer: ActionReducer<RootState>,
): ActionReducer<RootState> {
  return (state: RootState | undefined, action: Action) => {
    const result = reducer(state, action);
    console.groupCollapsed(action.type);
    console.log('prev state', state);
    console.log('action', action);
    console.log('next state', result);
    console.groupEnd();

    return result;
  };
}

export const metaReducers: MetaReducer<RootState>[] = !environment.production
  ? [logger]
  : [];
