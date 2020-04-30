import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concat, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AppActions, PlanningActions, ToastActions } from '../actions';
import { ConfirmDialogComponent } from '../components';
import { ApiService } from '../services';

@Injectable()
export class PlanningEffects {
  constructor(
    private actions: Actions,
    private apiService: ApiService,
    private dialog: MatDialog,
  ) {}

  createActivityInstance = createEffect(() => {
    return this.actions.pipe(
      ofType(PlanningActions.createActivityInstance),
      switchMap(({ planId, activityInstance }) =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService
            .createActivityInstances(planId, [activityInstance])
            .pipe(
              switchMap(({ ids: [id] }) => {
                return [
                  ToastActions.showToast({
                    message: 'Activity instance created',
                    toastType: 'success',
                  }),
                  PlanningActions.createActivityInstanceSuccess({
                    activityInstance: { ...activityInstance, id },
                  }),
                ];
              }),
              catchError((error: Error) => {
                console.error(error.message);
                return [
                  ToastActions.showToast({
                    message: 'Create activity instance failed',
                    toastType: 'error',
                  }),
                  PlanningActions.createActivityInstanceFailure({
                    errorMsg: error.message,
                  }),
                ];
              }),
            ),
          of(AppActions.setLoading({ loading: false })),
        ),
      ),
    );
  });

  createAdaptation = createEffect(() => {
    return this.actions.pipe(
      ofType(PlanningActions.createAdaptation),
      switchMap(({ adaptation }) =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.createAdaptation(adaptation).pipe(
            switchMap(({ id }) => {
              return [
                ToastActions.showToast({
                  message: 'Adaptation created',
                  toastType: 'success',
                }),
                PlanningActions.createAdaptationSuccess({
                  adaptation: {
                    id,
                    mission: adaptation.mission,
                    name: adaptation.name,
                    owner: adaptation.owner,
                    version: adaptation.version,
                  },
                }),
              ];
            }),
            catchError((error: Error) => {
              console.error(error.message);
              return [
                ToastActions.showToast({
                  message: 'Create adaptation failed',
                  toastType: 'error',
                }),
              ];
            }),
          ),
          of(AppActions.setLoading({ loading: false })),
        ),
      ),
    );
  });

  createPlan = createEffect(() => {
    return this.actions.pipe(
      ofType(PlanningActions.createPlan),
      switchMap(({ plan }) =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.createPlan(plan).pipe(
            switchMap(({ id }) => {
              return [
                ToastActions.showToast({
                  message: 'Plan created',
                  toastType: 'success',
                }),
                PlanningActions.createPlanSuccess({
                  plan: {
                    adaptationId: plan.adaptationId,
                    endTimestamp: plan.endTimestamp,
                    id,
                    name: plan.name,
                    startTimestamp: plan.startTimestamp,
                  },
                }),
              ];
            }),
            catchError((error: Error) => {
              console.error(error.message);
              return [
                ToastActions.showToast({
                  message: 'Create plan failed',
                  toastType: 'error',
                }),
              ];
            }),
          ),
          of(AppActions.setLoading({ loading: false })),
        ),
      ),
    );
  });

  deleteActivityInstance = createEffect(() => {
    return this.actions.pipe(
      ofType(PlanningActions.deleteActivityInstance),
      switchMap(({ planId, activityInstanceId }) => {
        const deleteActivityInstanceDialog = this.dialog.open(
          ConfirmDialogComponent,
          {
            data: {
              cancelText: 'No',
              confirmText: 'Yes',
              message: `Are you sure you want to permanently delete this activity instance?`,
            },
            width: '400px',
          },
        );
        return forkJoin([
          of(planId),
          of(activityInstanceId),
          deleteActivityInstanceDialog.afterClosed(),
        ]);
      }),
      map(([planId, activityInstanceId, result]) => ({
        activityInstanceId,
        planId,
        result,
      })),
      switchMap(({ planId, activityInstanceId, result }) => {
        if (result && result.confirm) {
          return concat(
            of(AppActions.setLoading({ loading: true })),
            this.apiService
              .deleteActivityInstance(planId, activityInstanceId)
              .pipe(
                switchMap(() => {
                  return [
                    ToastActions.showToast({
                      message: 'Activity instance deleted',
                      toastType: 'success',
                    }),
                    PlanningActions.deleteActivityInstanceSuccess({
                      activityInstanceId,
                    }),
                  ];
                }),
                catchError((error: Error) => {
                  console.error(error.message);
                  return [
                    ToastActions.showToast({
                      message: 'Delete activity instance failed',
                      toastType: 'error',
                    }),
                  ];
                }),
              ),
            of(AppActions.setLoading({ loading: false })),
          );
        }
        return [];
      }),
    );
  });

  deleteAdaptation = createEffect(() => {
    return this.actions.pipe(
      ofType(PlanningActions.deleteAdaptation),
      switchMap(({ id }) => {
        const deleteAdaptationDialog = this.dialog.open(
          ConfirmDialogComponent,
          {
            data: {
              cancelText: 'No',
              confirmText: 'Yes',
              message: `
                Are you sure you want to permanently delete this adaptation?
                All plans associated with this adaptation will stop working.
              `,
            },
            width: '400px',
          },
        );
        return forkJoin([of(id), deleteAdaptationDialog.afterClosed()]);
      }),
      map(([id, result]) => ({ id, result })),
      switchMap(({ id, result }) => {
        if (result && result.confirm) {
          return concat(
            of(AppActions.setLoading({ loading: true })),
            this.apiService.deleteAdaptation(id).pipe(
              switchMap(() => {
                return [
                  ToastActions.showToast({
                    message: 'Adaptation deleted',
                    toastType: 'success',
                  }),
                  PlanningActions.deleteAdaptationSuccess({ id }),
                ];
              }),
              catchError((error: Error) => {
                console.error(error.message);
                return [
                  ToastActions.showToast({
                    message: 'Delete adaptation failed',
                    toastType: 'error',
                  }),
                ];
              }),
            ),
            of(AppActions.setLoading({ loading: false })),
          );
        }
        return [];
      }),
    );
  });

  deletePlan = createEffect(() => {
    return this.actions.pipe(
      ofType(PlanningActions.deletePlan),
      switchMap(({ id }) => {
        const deletePlanDialog = this.dialog.open(ConfirmDialogComponent, {
          data: {
            cancelText: 'No',
            confirmText: 'Yes',
            message: `Are you sure you want to permanently delete this plan?`,
          },
          width: '400px',
        });
        return forkJoin([of(id), deletePlanDialog.afterClosed()]);
      }),
      map(([id, result]) => ({ id, result })),
      switchMap(({ id, result }) => {
        if (result && result.confirm) {
          return concat(
            of(AppActions.setLoading({ loading: true })),
            this.apiService.deletePlan(id).pipe(
              switchMap(() => {
                return [
                  ToastActions.showToast({
                    message: 'Plan deleted',
                    toastType: 'success',
                  }),
                  PlanningActions.deletePlanSuccess({ id }),
                ];
              }),
              catchError((error: Error) => {
                console.error(error.message);
                return [
                  ToastActions.showToast({
                    message: 'Delete plan failed',
                    toastType: 'error',
                  }),
                ];
              }),
            ),
            of(AppActions.setLoading({ loading: false })),
          );
        }
        return [];
      }),
    );
  });

  updateActivityInstance = createEffect(() => {
    return this.actions.pipe(
      ofType(PlanningActions.updateActivityInstance),
      switchMap(({ planId, activityInstance }) =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.updateActivityInstance(planId, activityInstance).pipe(
            switchMap(() => [
              ToastActions.showToast({
                message: 'Activity instance updated',
                toastType: 'success',
              }),
              PlanningActions.updateActivityInstanceSuccess({
                activityInstance,
              }),
            ]),
            catchError((error: Error) => {
              console.error(error.message);
              return [
                ToastActions.showToast({
                  message: 'Update activity instance failed',
                  toastType: 'error',
                }),
                PlanningActions.updateActivityInstanceFailure({
                  errorMsg: error.message,
                }),
              ];
            }),
          ),
          of(AppActions.setLoading({ loading: false })),
        ),
      ),
    );
  });
}
