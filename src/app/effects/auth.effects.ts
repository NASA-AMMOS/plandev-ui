import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concat, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { AppActions, AuthActions } from '../actions';
import { AERIE_USER } from '../constants';
import { ApiService } from '../services';
import { User } from '../types';

@Injectable()
export class AuthEffects {
  login = createEffect(() =>
    this.actions.pipe(
      ofType(AuthActions.login),
      switchMap(({ username, password }) =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.login(username, password).pipe(
            switchMap(({ editorUrl, ssoCookieValue }) => {
              const user: User = { editorUrl, name: username, ssoCookieValue };
              localStorage.setItem(AERIE_USER, JSON.stringify(user));
              return [AuthActions.loginSuccess({ redirectTo: '/plans', user })];
            }),
            catchError((error: Error) => {
              const errorMsg = error.message;
              return [AuthActions.loginError({ errorMsg })];
            }),
          ),
          of(AppActions.setLoading({ loading: false })),
        ),
      ),
    ),
  );

  loginSuccess = createEffect(
    () =>
      this.actions.pipe(
        ofType(AuthActions.loginSuccess),
        tap(({ redirectTo }) => this.router.navigate([redirectTo])),
      ),
    { dispatch: false },
  );

  logout = createEffect(() =>
    this.actions.pipe(
      ofType(AuthActions.logout),
      switchMap(() =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.logout().pipe(
            switchMap(() => {
              localStorage.removeItem(AERIE_USER);
              return [AuthActions.logoutSuccess()];
            }),
            catchError((errorMsg: string) => {
              console.log(errorMsg);
              localStorage.removeItem(AERIE_USER);
              // Even if we fail, succeed so we redirect to the login page.
              return [AuthActions.logoutSuccess()];
            }),
          ),
          of(AppActions.setLoading({ loading: false })),
        ),
      ),
    ),
  );

  logoutSuccess = createEffect(
    () =>
      this.actions.pipe(
        ofType(AuthActions.logoutSuccess),
        tap(() => this.router.navigate(['/login'])),
      ),
    { dispatch: false },
  );

  constructor(
    private actions: Actions,
    private apiService: ApiService,
    private router: Router,
  ) {}
}
