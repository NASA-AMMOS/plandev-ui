import { NgModule } from '@angular/core';
import {
  Params,
  RouterModule,
  RouterStateSnapshot,
  Routes,
} from '@angular/router';
import { RouterStateSerializer } from '@ngrx/router-store';
import {
  AdaptationsComponent,
  LoginComponent,
  PlanComponent,
  PlansComponent,
} from './containers';
import {
  AuthGuard,
  redirectLoggedInTo,
  redirectUnauthorizedTo,
} from './guards';

const redirectLoggedInToPlans = () => redirectLoggedInTo(['plans']);
const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['login']);

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: AdaptationsComponent,
    data: { authGuardPipe: redirectUnauthorizedToLogin },
    path: 'adaptations',
  },
  {
    canActivate: [AuthGuard],
    component: LoginComponent,
    data: { authGuardPipe: redirectLoggedInToPlans },
    path: 'login',
  },
  {
    canActivate: [AuthGuard],
    component: PlanComponent,
    data: { authGuardPipe: redirectUnauthorizedToLogin },
    path: 'plans/:id',
  },
  {
    canActivate: [AuthGuard],
    component: PlansComponent,
    data: { authGuardPipe: redirectUnauthorizedToLogin },
    path: 'plans',
  },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forRoot(routes, { useHash: true })],
})
export class AppRoutingModule {}

export interface RouterState {
  params: Params;
  path: string;
  queryParams: Params;
  url: string;
}

export class RouterSerializer implements RouterStateSerializer<RouterState> {
  serialize(routerStateSnapshot: RouterStateSnapshot): RouterState {
    const { url, root } = routerStateSnapshot;

    let route = root;
    const path: string[] = [];
    while (route.firstChild) {
      route = route.firstChild;
      if (route.routeConfig && route.routeConfig.path) {
        path.push(route.routeConfig.path);
      }
    }

    const routerState: RouterState = {
      params: route.params,
      path: path.join('/'),
      queryParams: root.queryParams,
      url,
    };

    return routerState;
  }
}
