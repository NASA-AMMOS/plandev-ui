import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { select, Store } from '@ngrx/store';
import { Observable, pipe, UnaryFunction } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { State } from '../app-store';
import { getUser } from '../selectors';
import { User } from '../types';

export type AuthPipeGenerator = (
  next: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => AuthPipe;

export type AuthPipe = UnaryFunction<
  Observable<User | null>,
  Observable<boolean | any[]>
>;

/**
 * @see https://github.com/angular/angularfire/blob/master/src/auth-guard/auth-guard.ts
 */
@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private store: Store<State>) {}

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const authPipeFactory: AuthPipeGenerator =
      next.data.authGuardPipe || (() => loggedIn);

    return this.store.pipe(
      select(getUser),
      take(1),
      authPipeFactory(next, state),
      map(canActivate =>
        typeof canActivate === 'boolean'
          ? canActivate
          : this.router.createUrlTree(canActivate),
      ),
    );
  }
}

export const loggedIn: AuthPipe = map(user => !!user);
export const redirectUnauthorizedTo = (redirect: any[]) =>
  pipe(
    loggedIn,
    map(isLoggedIn => isLoggedIn || redirect),
  );
export const redirectLoggedInTo = (redirect: any[]) =>
  pipe(
    loggedIn,
    map(isLoggedIn => (isLoggedIn && redirect) || true),
  );
