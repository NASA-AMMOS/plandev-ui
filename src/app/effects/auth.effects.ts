import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concat, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { AuthActions, PlanningActions } from '../actions';
import { AERIE_USER } from '../constants';
import { ApiService } from '../services';
import { User } from '../types';

@Injectable()
export class AuthEffects {
  constructor(
    private actions: Actions,
    private apiService: ApiService,
    private router: Router,
  ) {}

  login = createEffect(() =>
    this.actions.pipe(
      ofType(AuthActions.login),
      switchMap(({ username, password }) =>
        concat(
          of(PlanningActions.setLoading({ loading: true })),
          this.apiService.login(username, password).pipe(
            switchMap(() => {
              const user: User = { name: username };
              localStorage.setItem(AERIE_USER, JSON.stringify(user));
              return [AuthActions.loginSuccess({ redirectTo: '/plans', user })];
            }),
            catchError((errorMsg: string) => {
              console.log(errorMsg);
              return [AuthActions.loginError({ errorMsg })];
            }),
          ),
          of(PlanningActions.setLoading({ loading: false })),
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
          of(PlanningActions.setLoading({ loading: true })),
          this.apiService.logout().pipe(
            switchMap(() => {
              localStorage.removeItem(AERIE_USER);
              return [AuthActions.logoutSuccess()];
            }),
            catchError((errorMsg: string) => {
              console.log(errorMsg);
              return [AuthActions.logoutError({ errorMsg })];
            }),
          ),
          of(PlanningActions.setLoading({ loading: false })),
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
}
