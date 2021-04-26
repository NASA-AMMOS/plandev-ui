import { Location } from '@angular/common';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { concat, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { AppActions, PlanningActions, ToastActions } from '../actions';
import { RootState } from '../app-store';
import {
  ConfirmDialogComponent,
  HorizontalGuideDialogComponent,
  LoadViewDialogComponent,
  SaveAsViewDialogComponent,
} from '../components';
import { LayerDialogComponent } from '../components/layer-dialog/layer-dialog.component';
import { VerticalGuideDialogComponent } from '../components/vertical-guide-dialog/vertical-guide-dialog.component';
import { AERIE_USER } from '../constants';
import { ApiService } from '../services';
import {
  HorizontalGuide,
  HorizontalGuideEvent,
  User,
  VerticalGuide,
  VerticalGuideEvent,
  View,
} from '../types';

@Injectable()
export class PlanningEffects {
  createActivityInstance = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.createActivityInstance),
      switchMap(({ planId, activityInstance }) =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService
            .createActivityInstances(planId, [activityInstance])
            .pipe(
              switchMap(({ ids: [id] }) => [
                ToastActions.showToast({
                  message: 'Activity instance created',
                  toastType: 'success',
                }),
                PlanningActions.createActivityInstanceSuccess({
                  activityInstance: {
                    ...activityInstance,
                    children: [],
                    duration: 0,
                    id,
                    parent: null,
                  },
                }),
              ]),
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
    ),
  );

  createAdaptation = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.createAdaptation),
      switchMap(({ adaptation }) =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.createAdaptation(adaptation).pipe(
            switchMap(({ id }) => [
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
            ]),
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
    ),
  );

  createPlan = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.createPlan),
      switchMap(({ plan }) =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.createPlan(plan).pipe(
            switchMap(({ id }) => [
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
            ]),
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
    ),
  );

  deleteActivityInstance = createEffect(() =>
    this.actions.pipe(
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
                switchMap(() => [
                  ToastActions.showToast({
                    message: 'Activity instance deleted',
                    toastType: 'success',
                  }),
                  PlanningActions.deleteActivityInstanceSuccess({
                    activityInstanceId,
                  }),
                ]),
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
    ),
  );

  deleteAdaptation = createEffect(() =>
    this.actions.pipe(
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
              switchMap(() => [
                ToastActions.showToast({
                  message: 'Adaptation deleted',
                  toastType: 'success',
                }),
                PlanningActions.deleteAdaptationSuccess({ id }),
              ]),
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
    ),
  );

  deleteConstraint = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.deleteConstraint),
      withLatestFrom(this.store),
      map(([action, state]) => ({ action, state })),
      switchMap(({ action, state: { planning } }) => {
        const { adaptationId } = planning.selectedPlan;
        const { constraintName } = action;
        return concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService
            .deleteAdaptationConstraints(adaptationId, [constraintName])
            .pipe(
              switchMap(() => [
                ToastActions.showToast({
                  message: 'Constraint deleted',
                  toastType: 'success',
                }),
                PlanningActions.deleteConstraintSuccess({ constraintName }),
              ]),
              catchError((error: Error) => {
                const errorMsg = error.message;
                console.error(errorMsg);
                return [
                  ToastActions.showToast({
                    message: 'Delete constraint failed',
                    toastType: 'error',
                  }),
                ];
              }),
            ),
          of(AppActions.setLoading({ loading: false })),
        );
      }),
    ),
  );

  deletePlan = createEffect(() =>
    this.actions.pipe(
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
              switchMap(() => [
                ToastActions.showToast({
                  message: 'Plan deleted',
                  toastType: 'success',
                }),
                PlanningActions.deletePlanSuccess({ id }),
              ]),
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
    ),
  );

  deleteView = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.deleteView),
      withLatestFrom(this.store),
      switchMap(([{ id }, { planning }]) =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.deleteView(id).pipe(
            switchMap(({ nextView }) => {
              if (planning.view.id === id) {
                this.replaceViewId(nextView.id);
                return [
                  PlanningActions.setView({ view: nextView }),
                  ToastActions.showToast({
                    message: `View deleted`,
                    toastType: 'success',
                  }),
                ];
              } else {
                return [
                  ToastActions.showToast({
                    message: `View deleted`,
                    toastType: 'success',
                  }),
                ];
              }
            }),
            catchError((error: Error) => {
              console.error(error.message);
              return [
                ToastActions.showToast({
                  message: 'Delete view failed',
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

  horizontalGuideOpenDialog = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.horizontalGuideOpenDialog),
      switchMap(({ event }) => {
        const guideDialog = this.dialog.open(HorizontalGuideDialogComponent, {
          data: event,
          width: '400px',
        });
        return forkJoin<HorizontalGuideEvent, HorizontalGuide | null>([
          of(event),
          guideDialog.afterClosed(),
        ]);
      }),
      map(([event, guide]) => ({ event, guide })),
      switchMap(({ event, guide }) => {
        const { rowId } = event;
        if (guide && event.mode === 'create') {
          return [PlanningActions.horizontalGuideCreate({ guide, rowId })];
        } else if (guide && event.mode === 'edit') {
          return [PlanningActions.horizontalGuideUpdate({ guide, rowId })];
        } else {
          return [];
        }
      }),
    ),
  );

  layerOpenDialog = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.layerOpenDialog),
      switchMap(({ event }) => {
        const layerDialog = this.dialog.open(LayerDialogComponent, {
          autoFocus: false,
          data: event,
          hasBackdrop: false,
          width: '400px',
        });
        return layerDialog.afterClosed();
      }),
      switchMap(() => []),
    ),
  );

  loadView = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.loadView),
      switchMap(({ id }) =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.getViewById(id).pipe(
            map((view: View) => {
              this.replaceViewId(view.id);
              return PlanningActions.setView({ view });
            }),
            catchError((error: Error) => {
              console.error(error);
              return [];
            }),
          ),
          of(AppActions.setLoading({ loading: false })),
          of(AppActions.resize()),
        ),
      ),
    ),
  );

  openLoadViewDialog = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.openLoadViewDialog),
      switchMap(() => {
        const user: User = JSON.parse(localStorage.getItem(AERIE_USER));
        const dialog = this.dialog.open(LoadViewDialogComponent, {
          autoFocus: false,
          data: { user },
          maxHeight: '600px',
          width: '850px',
        });
        return dialog.afterClosed();
      }),
      switchMap(res => {
        if (res) {
          const { action, view } = res;
          if (action === 'delete' && view) {
            const { id } = view;
            return [PlanningActions.deleteView({ id })];
          } else if (action === 'load' && view) {
            const { id } = view;
            return [PlanningActions.loadView({ id })];
          } else {
            return [];
          }
        } else {
          return [];
        }
      }),
    ),
  );

  openSaveAsViewDialog = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.openSaveAsViewDialog),
      withLatestFrom(this.store),
      switchMap(([_, { planning }]) => {
        const { view } = planning;
        const dialog = this.dialog.open(SaveAsViewDialogComponent, {
          autoFocus: false,
          data: { view },
          width: '700px',
        });
        return dialog.afterClosed();
      }),
      switchMap((view: View | null) => {
        if (view) {
          return [PlanningActions.saveAsView({ view })];
        }
        return [];
      }),
    ),
  );

  runSimulation = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.runSimulation),
      withLatestFrom(this.store),
      map(([action, state]) => ({ action, state })),
      switchMap(({ action, state }) => {
        const { adaptationId } = state.planning.selectedPlan;
        return concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.simulate(adaptationId, action.planId).pipe(
            switchMap(simulationResponse => [
              PlanningActions.runSimulationSuccess({ simulationResponse }),
            ]),
            catchError((error: Error) => {
              console.log(error.message);
              return [
                PlanningActions.runSimulationFailure({
                  errorMsg: error.message,
                }),
              ];
            }),
          ),
          of(AppActions.setLoading({ loading: false })),
        );
      }),
    ),
  );

  saveAsView = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.saveAsView),
      switchMap(({ view }) =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.saveAsView(view).pipe(
            switchMap(({ view: newView }) => {
              this.replaceViewId(newView.id);
              return [
                PlanningActions.setView({ view: newView }),
                ToastActions.showToast({
                  message: 'View saved',
                  toastType: 'success',
                }),
              ];
            }),
            catchError((error: Error) => {
              console.error(error.message);
              return [
                ToastActions.showToast({
                  message: 'Save view failed',
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

  saveView = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.saveView),
      withLatestFrom(this.store),
      switchMap(([_, { planning }]) =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.saveView(planning.view).pipe(
            switchMap(() => {
              return [
                ToastActions.showToast({
                  message: 'View saved',
                  toastType: 'success',
                }),
              ];
            }),
            catchError((error: Error) => {
              console.error(error.message);
              return [
                ToastActions.showToast({
                  message: 'Save view failed',
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

  updateActivityInstance = createEffect(() =>
    this.actions.pipe(
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
    ),
  );

  updateConstraint = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.updateConstraint),
      withLatestFrom(this.store),
      map(([action, state]) => ({ action, state })),
      switchMap(({ action, state: { planning } }) => {
        const { adaptationId } = planning.selectedPlan;
        const { constraint } = action;
        return concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService
            .updateAdaptationConstraints(adaptationId, [constraint])
            .pipe(
              switchMap(() => [
                ToastActions.showToast({
                  message: 'Constraint updated',
                  toastType: 'success',
                }),
                PlanningActions.updateConstraintSuccess({
                  constraint,
                }),
              ]),
              catchError((error: Error) => {
                const errorMsg = error.message;
                console.error(errorMsg);
                return [
                  ToastActions.showToast({
                    message: 'Update constraint failed',
                    toastType: 'error',
                  }),
                ];
              }),
            ),
          of(AppActions.setLoading({ loading: false })),
        );
      }),
    ),
  );

  verticalGuideOpenDialog = createEffect(() =>
    this.actions.pipe(
      ofType(PlanningActions.verticalGuideOpenDialog),
      switchMap(({ event }) => {
        const guideDialog = this.dialog.open(VerticalGuideDialogComponent, {
          data: event,
          width: '400px',
        });
        return forkJoin<VerticalGuideEvent, VerticalGuide | null>([
          of(event),
          guideDialog.afterClosed(),
        ]);
      }),
      map(([event, guide]) => ({ event, guide })),
      switchMap(({ event, guide }) => {
        const { timelineId } = event;
        if (guide && event.mode === 'create') {
          return [PlanningActions.verticalGuideCreate({ guide, timelineId })];
        } else if (guide && event.mode === 'edit') {
          return [PlanningActions.verticalGuideUpdate({ guide, timelineId })];
        } else {
          return [];
        }
      }),
    ),
  );

  constructor(
    private actions: Actions,
    private apiService: ApiService,
    private dialog: MatDialog,
    private location: Location,
    private store: Store<RootState>,
  ) {}

  replaceViewId(id: string) {
    const [basePath] = this.location.path().split('?');
    this.location.replaceState(basePath, `viewId=${id}`);
  }
}
