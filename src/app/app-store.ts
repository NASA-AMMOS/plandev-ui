import { InjectionToken } from '@angular/core';
import * as fromRouter from '@ngrx/router-store';
import {
  Action,
  ActionReducer,
  ActionReducerMap,
  MetaReducer,
} from '@ngrx/store';
import { environment } from 'src/environments/environment';
import { AuthReducer, MerlinReducer, SimulationReducer } from './reducers';

export interface AppState {
  auth: AuthReducer.AuthState;
  merlin: MerlinReducer.MerlinState;
  router: fromRouter.RouterReducerState;
  simulation: SimulationReducer.SimulationState;
}

export const ROOT_REDUCERS = new InjectionToken<
  ActionReducerMap<AppState, Action>
>('Root reducers token', {
  factory: () => ({
    auth: AuthReducer.reducer,
    merlin: MerlinReducer.reducer,
    router: fromRouter.routerReducer,
    simulation: SimulationReducer.reducer,
  }),
});

export function logger(
  reducer: ActionReducer<AppState>,
): ActionReducer<AppState> {
  return (state: AppState | undefined, action: Action) => {
    const result = reducer(state, action);
    console.groupCollapsed(action.type);
    console.log('prev state', state);
    console.log('action', action);
    console.log('next state', result);
    console.groupEnd();

    return result;
  };
}

export const metaReducers: MetaReducer<AppState>[] = !environment.production
  ? [logger]
  : [];
