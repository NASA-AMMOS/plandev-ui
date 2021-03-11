import { RouterNavigatedAction, ROUTER_NAVIGATED } from '@ngrx/router-store';
import { Action } from '@ngrx/store';
import { MonoTypeOperatorFunction, OperatorFunction } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { RouterState } from '../app-routing.module';

export function isRoute(route: string): (action: Action) => boolean {
  return (action: Action) => {
    if (action.type === ROUTER_NAVIGATED) {
      const routerAction = action as RouterNavigatedAction<RouterState>;
      const { path } = routerAction.payload.routerState;
      return route === path;
    }
    return false;
  };
}

export function ofRoute(route: string): MonoTypeOperatorFunction<Action> {
  return filter<Action>(isRoute(route));
}

export function mapToRouterState(): OperatorFunction<
  RouterNavigatedAction<RouterState>,
  RouterState
> {
  return map<RouterNavigatedAction<RouterState>, RouterState>(routerAction => {
    return routerAction.payload.routerState;
  });
}
