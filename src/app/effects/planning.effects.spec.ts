import { HttpClientModule } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { AppActions, PlanningActions, ToastActions } from '../actions';
import {
  activityInstance,
  activityInstanceId,
  adaptation,
  adaptationId,
  plan,
  planId,
} from '../mocks';
import { ApiMockService, ApiService } from '../services';
import { PlanningEffects } from './planning.effects';

describe('planning effects', () => {
  let actions: Observable<Action>;
  let apiService: ApiService;
  let dialog: any;
  let effects: PlanningEffects;
  let testScheduler: TestScheduler;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule, MatDialogModule],
      providers: [
        PlanningEffects,
        provideMockActions(() => actions),
        {
          provide: ApiService,
          useValue: new ApiMockService(),
        },
      ],
    });
    apiService = TestBed.inject(ApiService);
    actions = TestBed.inject(Actions);
    dialog = TestBed.inject(MatDialog);
    effects = TestBed.inject(PlanningEffects);
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  describe('createActivityInstance', () => {
    it('succeeds', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = PlanningActions.createActivityInstance({
          activityInstance,
          planId,
        });
        actions = hot('-a', { a: action });
        expectObservable(effects.createActivityInstance).toBe('-(bcde)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: 'Activity instance created',
            toastType: 'success',
          }),
          d: PlanningActions.createActivityInstanceSuccess({
            activityInstance: { ...activityInstance, id: activityInstanceId },
          }),
          e: AppActions.setLoading({ loading: false }),
        });
      });
    });

    it('fails', () => {
      testScheduler.run(({ cold, hot, expectObservable }) => {
        const action = PlanningActions.createActivityInstance({
          activityInstance,
          planId,
        });
        const errorMsg = 'Create activity instance failed';
        actions = hot('-a', { a: action });
        spyOn(apiService, 'createActivityInstances').and.returnValue(
          cold('#|', null, new Error(errorMsg)),
        );
        expectObservable(effects.createActivityInstance).toBe('-(bcde)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: errorMsg,
            toastType: 'error',
          }),
          d: PlanningActions.createActivityInstanceFailure({
            errorMsg,
          }),
          e: AppActions.setLoading({ loading: false }),
        });
      });
    });
  });

  describe('createAdaptation', () => {
    it('succeeds', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = PlanningActions.createAdaptation({
          adaptation: {
            file: new File([], ''),
            mission: adaptation.mission,
            name: adaptation.name,
            owner: adaptation.owner,
            version: adaptation.version,
          },
        });
        actions = hot('-a', { a: action });
        expectObservable(effects.createAdaptation).toBe('-(bcde)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: 'Adaptation created',
            toastType: 'success',
          }),
          d: PlanningActions.createAdaptationSuccess({
            adaptation: {
              id: adaptationId,
              mission: adaptation.mission,
              name: adaptation.name,
              owner: adaptation.owner,
              version: adaptation.version,
            },
          }),
          e: AppActions.setLoading({ loading: false }),
        });
      });
    });

    it('fails', () => {
      testScheduler.run(({ cold, hot, expectObservable }) => {
        const action = PlanningActions.createAdaptation({
          adaptation: {
            file: new File([], ''),
            mission: adaptation.mission,
            name: adaptation.name,
            owner: adaptation.owner,
            version: adaptation.version,
          },
        });
        const errorMsg = 'Create adaptation failed';
        actions = hot('-a', { a: action });
        spyOn(apiService, 'createAdaptation').and.returnValue(
          cold('#|', null, new Error(errorMsg)),
        );
        expectObservable(effects.createAdaptation).toBe('-(bcd)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: errorMsg,
            toastType: 'error',
          }),
          d: AppActions.setLoading({ loading: false }),
        });
      });
    });
  });

  describe('createPlan', () => {
    it('succeeds', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = PlanningActions.createPlan({
          plan,
        });
        actions = hot('-a', { a: action });
        expectObservable(effects.createPlan).toBe('-(bcde)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: 'Plan created',
            toastType: 'success',
          }),
          d: PlanningActions.createPlanSuccess({
            plan: {
              adaptationId: plan.adaptationId,
              endTimestamp: plan.endTimestamp,
              id: planId,
              name: plan.name,
              startTimestamp: plan.startTimestamp,
            },
          }),
          e: AppActions.setLoading({ loading: false }),
        });
      });
    });

    it('fails', () => {
      testScheduler.run(({ cold, hot, expectObservable }) => {
        const action = PlanningActions.createPlan({
          plan,
        });
        const errorMsg = 'Create plan failed';
        actions = hot('-a', { a: action });
        spyOn(apiService, 'createPlan').and.returnValue(
          cold('#|', null, new Error(errorMsg)),
        );
        expectObservable(effects.createPlan).toBe('-(bcd)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: errorMsg,
            toastType: 'error',
          }),
          d: AppActions.setLoading({ loading: false }),
        });
      });
    });
  });

  describe('deleteActivityInstance', () => {
    it('succeeds', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = PlanningActions.deleteActivityInstance({
          activityInstanceId,
          planId,
        });
        spyOn(dialog, 'open').and.returnValue({
          afterClosed() {
            return of({ confirm: true });
          },
        });
        actions = hot('-a', { a: action });
        expectObservable(effects.deleteActivityInstance).toBe('-(bcde)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: 'Activity instance deleted',
            toastType: 'success',
          }),
          d: PlanningActions.deleteActivityInstanceSuccess({
            activityInstanceId,
          }),
          e: AppActions.setLoading({ loading: false }),
        });
      });
    });

    it('succeeds but not confirmed', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = PlanningActions.deleteActivityInstance({
          activityInstanceId,
          planId,
        });
        spyOn(dialog, 'open').and.returnValue({
          afterClosed() {
            return of({ confirm: false });
          },
        });
        actions = hot('-a', { a: action });
        expectObservable(effects.deleteActivityInstance).toBe('-');
      });
    });

    it('fails', () => {
      testScheduler.run(({ cold, hot, expectObservable }) => {
        const action = PlanningActions.deleteActivityInstance({
          activityInstanceId,
          planId,
        });
        spyOn(dialog, 'open').and.returnValue({
          afterClosed() {
            return of({ confirm: true });
          },
        });
        const errorMsg = 'Delete activity instance failed';
        actions = hot('-a', { a: action });
        spyOn(apiService, 'deleteActivityInstance').and.returnValue(
          cold('#|', null, new Error(errorMsg)),
        );
        expectObservable(effects.deleteActivityInstance).toBe('-(bcd)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: errorMsg,
            toastType: 'error',
          }),
          d: AppActions.setLoading({ loading: false }),
        });
      });
    });
  });

  describe('deleteAdaptation', () => {
    it('succeeds', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = PlanningActions.deleteAdaptation({
          id: adaptationId,
        });
        spyOn(dialog, 'open').and.returnValue({
          afterClosed() {
            return of({ confirm: true });
          },
        });
        actions = hot('-a', { a: action });
        expectObservable(effects.deleteAdaptation).toBe('-(bcde)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: 'Adaptation deleted',
            toastType: 'success',
          }),
          d: PlanningActions.deleteAdaptationSuccess({ id: adaptationId }),
          e: AppActions.setLoading({ loading: false }),
        });
      });
    });

    it('succeeds but not confirmed', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = PlanningActions.deleteAdaptation({
          id: adaptationId,
        });
        spyOn(dialog, 'open').and.returnValue({
          afterClosed() {
            return of({ confirm: false });
          },
        });
        actions = hot('-a', { a: action });
        expectObservable(effects.deleteAdaptation).toBe('-');
      });
    });

    it('fails', () => {
      testScheduler.run(({ cold, hot, expectObservable }) => {
        const action = PlanningActions.deleteAdaptation({
          id: adaptationId,
        });
        spyOn(dialog, 'open').and.returnValue({
          afterClosed() {
            return of({ confirm: true });
          },
        });
        const errorMsg = 'Delete adaptation failed';
        actions = hot('-a', { a: action });
        spyOn(apiService, 'deleteAdaptation').and.returnValue(
          cold('#|', null, new Error(errorMsg)),
        );
        expectObservable(effects.deleteAdaptation).toBe('-(bcd)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: errorMsg,
            toastType: 'error',
          }),
          d: AppActions.setLoading({ loading: false }),
        });
      });
    });
  });

  describe('deletePlan', () => {
    it('succeeds', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = PlanningActions.deletePlan({
          id: planId,
        });
        spyOn(dialog, 'open').and.returnValue({
          afterClosed() {
            return of({ confirm: true });
          },
        });
        actions = hot('-a', { a: action });
        expectObservable(effects.deletePlan).toBe('-(bcde)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: 'Plan deleted',
            toastType: 'success',
          }),
          d: PlanningActions.deletePlanSuccess({ id: planId }),
          e: AppActions.setLoading({ loading: false }),
        });
      });
    });

    it('succeeds but not confirmed', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = PlanningActions.deletePlan({
          id: planId,
        });
        spyOn(dialog, 'open').and.returnValue({
          afterClosed() {
            return of({ confirm: false });
          },
        });
        actions = hot('-a', { a: action });
        expectObservable(effects.deletePlan).toBe('-');
      });
    });

    it('fails', () => {
      testScheduler.run(({ cold, hot, expectObservable }) => {
        const action = PlanningActions.deletePlan({
          id: planId,
        });
        spyOn(dialog, 'open').and.returnValue({
          afterClosed() {
            return of({ confirm: true });
          },
        });
        const errorMsg = 'Delete plan failed';
        actions = hot('-a', { a: action });
        spyOn(apiService, 'deletePlan').and.returnValue(
          cold('#|', null, new Error(errorMsg)),
        );
        expectObservable(effects.deletePlan).toBe('-(bcd)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: errorMsg,
            toastType: 'error',
          }),
          d: AppActions.setLoading({ loading: false }),
        });
      });
    });
  });

  describe('updateActivityInstance', () => {
    it('succeeds', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = PlanningActions.updateActivityInstance({
          activityInstance,
          planId,
        });
        actions = hot('-a', { a: action });
        expectObservable(effects.updateActivityInstance).toBe('-(bcde)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: 'Activity instance updated',
            toastType: 'success',
          }),
          d: PlanningActions.updateActivityInstanceSuccess({
            activityInstance,
          }),
          e: AppActions.setLoading({ loading: false }),
        });
      });
    });

    it('fails', () => {
      testScheduler.run(({ cold, hot, expectObservable }) => {
        const action = PlanningActions.updateActivityInstance({
          activityInstance,
          planId,
        });
        const errorMsg = 'Update activity instance failed';
        actions = hot('-a', { a: action });
        spyOn(apiService, 'updateActivityInstance').and.returnValue(
          cold('#|', null, new Error(errorMsg)),
        );
        expectObservable(effects.updateActivityInstance).toBe('-(bcde)', {
          b: AppActions.setLoading({ loading: true }),
          c: ToastActions.showToast({
            message: errorMsg,
            toastType: 'error',
          }),
          d: PlanningActions.updateActivityInstanceFailure({
            errorMsg,
          }),
          e: AppActions.setLoading({ loading: false }),
        });
      });
    });
  });
});
