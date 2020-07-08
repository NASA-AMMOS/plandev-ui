import { Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { concat, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  AppActions,
  AuthActions,
  PlanningActions,
  ToastActions,
} from '../actions';
import { AERIE_USER } from '../constants';
import { mapToParam, ofRoute } from '../functions';
import { ApiService } from '../services';
import { User } from '../types';

@Injectable()
export class NavEffects {
  constructor(private actions: Actions, private apiService: ApiService) {}

  /**
   * Application-level store initialization can go in here.
   * @see https://ngrx.io/guide/effects/lifecycle#root_effects_init
   */
  init = createEffect(() =>
    this.actions.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => {
        const item: string | null = localStorage.getItem(AERIE_USER);
        if (item !== null) {
          const user: User = JSON.parse(item);
          const { hash } = window.location;
          const redirectTo = hash.substring(1); // Remove '#' from hash URL.
          return [AuthActions.loginSuccess({ redirectTo, user })];
        }
        return [];
      }),
    ),
  );

  navAdaptations = createEffect(() =>
    this.actions.pipe(
      ofRoute('adaptations'),
      switchMap(_ =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.getAdaptations().pipe(
            map(adaptations =>
              PlanningActions.getAdaptationsSuccess({ adaptations }),
            ),
            catchError((error: Error) => {
              console.error(error);
              return [
                ToastActions.showToast({
                  message: 'Fetch adaptations failed',
                  toastType: 'error',
                }),
              ];
            }),
          ),
          of(AppActions.setLoading({ loading: false })),
        ),
      ),
    ),
  );

  navPlans = createEffect(() =>
    this.actions.pipe(
      ofRoute('plans'),
      switchMap(_ =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.getPlansAndAdaptations().pipe(
            switchMap(({ adaptations, plans }) => [
              PlanningActions.getPlansSuccess({ plans }),
              PlanningActions.getAdaptationsSuccess({ adaptations }),
            ]),
            catchError((error: Error) => {
              console.error(error);
              return [
                ToastActions.showToast({
                  message: 'Fetch plans and adaptations failed',
                  toastType: 'error',
                }),
              ];
            }),
          ),
          of(AppActions.setLoading({ loading: false })),
        ),
      ),
    ),
  );

  navPlansWithId = createEffect(() =>
    this.actions.pipe(
      ofRoute('plans/:id'),
      mapToParam<string>('id'),
      switchMap(planId =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.getUiStates().pipe(
            map(uiStates => PlanningActions.updateAllUiStates({ uiStates })),
            catchError((error: Error) => {
              console.error(error);
              return [
                ToastActions.showToast({
                  message: 'Fetch UI states failed',
                  toastType: 'error',
                }),
              ];
            }),
          ),
          this.apiService.getPlanDetail(planId).pipe(
            map(plan => PlanningActions.getPlanDetailSuccess({ plan })),
            catchError((error: Error) => {
              console.error(error);
              return [
                ToastActions.showToast({
                  message: 'Fetch plan detail failed',
                  toastType: 'error',
                }),
              ];
            }),
          ),
          of(AppActions.setLoading({ loading: false })),
        ),
      ),
    ),
  );
}
