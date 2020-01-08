import { Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { concat, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthActions, MerlinActions, ToastActions } from '../actions';
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
          return [AuthActions.loginSuccess({ user })];
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
          of(MerlinActions.setLoading({ loading: true })),
          this.apiService.getAdaptations().pipe(
            map(adaptations => MerlinActions.setAdaptations({ adaptations })),
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
          of(MerlinActions.setLoading({ loading: false })),
        ),
      ),
    ),
  );

  navPlans = createEffect(() =>
    this.actions.pipe(
      ofRoute('plans'),
      switchMap(_ =>
        concat(
          of(MerlinActions.setLoading({ loading: true })),
          this.apiService.getAdaptations().pipe(
            map(adaptations => MerlinActions.setAdaptations({ adaptations })),
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
          this.apiService.getPlans().pipe(
            map(plans => MerlinActions.setPlans({ plans })),
            catchError((error: Error) => {
              console.error(error);
              return [
                ToastActions.showToast({
                  message: 'Fetch plans failed',
                  toastType: 'error',
                }),
              ];
            }),
          ),
          of(MerlinActions.setLoading({ loading: false })),
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
          of(MerlinActions.setLoading({ loading: true })),
          this.apiService.getPlanAndActivityTypes(planId).pipe(
            map(({ activityTypes, plan }) =>
              MerlinActions.setSelectedPlanAndActivityTypes({
                activityTypes,
                selectedPlan: plan,
              }),
            ),
            catchError((error: Error) => {
              console.error(error);
              return [
                ToastActions.showToast({
                  message: 'Fetch plan and activity types failed',
                  toastType: 'error',
                }),
              ];
            }),
          ),
          this.apiService.getActivityInstances(planId).pipe(
            map(activityInstances =>
              MerlinActions.setActivityInstances({ planId, activityInstances }),
            ),
            catchError((error: Error) => {
              console.error(error);
              return [
                ToastActions.showToast({
                  message: 'Fetch activity instances failed',
                  toastType: 'error',
                }),
              ];
            }),
          ),
          of(MerlinActions.setLoading({ loading: false })),
        ),
      ),
    ),
  );
}
