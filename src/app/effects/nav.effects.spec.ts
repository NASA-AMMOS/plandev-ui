import { HttpClientModule } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { RouterNavigatedAction } from '@ngrx/router-store';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { AppActions, AuthActions, PlanningActions } from '../actions';
import { RouterState } from '../app-routing.module';
import { adaptations, planDetail, planId, plans, uiStates } from '../mocks';
import { ApiMockService, ApiService } from '../services';
import { NavEffects } from './nav.effects';

function getRouterNavigatedAction(url: string, path?: string, params = {}) {
  const action: RouterNavigatedAction<RouterState> = {
    payload: {
      event: {
        id: 1,
        url: `/${url}`,
        urlAfterRedirects: `/${url}`,
      },
      routerState: {
        params,
        path: path || `${url}`,
        queryParams: {},
        url: `/${url}`,
      },
    },
    type: '@ngrx/router-store/navigated',
  };
  return action;
}

describe('nav effects', () => {
  let actions: Observable<Action>;
  let apiService: ApiService;
  let effects: NavEffects;
  let testScheduler: TestScheduler;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [
        NavEffects,
        provideMockActions(() => actions),
        {
          provide: ApiService,
          useValue: new ApiMockService(),
        },
      ],
    });
    apiService = TestBed.inject(ApiService);
    actions = TestBed.inject(Actions);
    effects = TestBed.inject(NavEffects);
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  describe('init', () => {
    it('should not return any actions when there is no AERIE_USER', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = { type: '@ngrx/effects/init' };
        actions = hot('-a', { a: action });
        expectObservable(effects.init).toBe('-');
      });
    });

    it('should return a login success action if there is an AERIE_USER', () => {
      const user = { name: 'testuser', ssoCookieValue: '42' };
      spyOn(localStorage.__proto__, 'getItem').and.returnValue(
        JSON.stringify(user),
      );
      testScheduler.run(({ hot, expectObservable }) => {
        const action = { type: '@ngrx/effects/init' };
        actions = hot('-a', { a: action });
        expectObservable(effects.init).toBe('-b', {
          b: AuthActions.loginSuccess({ redirectTo: '', user }),
        });
      });
    });
  });

  describe('navAdaptations', () => {
    it('should dispatch the appropriate actions when navigating to /adaptations', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = getRouterNavigatedAction('adaptations');
        actions = hot('-a', { a: action });
        expectObservable(effects.navAdaptations).toBe('-(bcd)', {
          b: AppActions.setLoading({ loading: true }),
          c: PlanningActions.getAdaptationsSuccess({
            adaptations,
          }),
          d: AppActions.setLoading({ loading: false }),
        });
      });
    });

    it('should dispatch the appropriate actions when navigating to /adaptations and getAdaptations fails', () => {
      testScheduler.run(({ cold, hot, expectObservable }) => {
        const action = getRouterNavigatedAction('adaptations');
        actions = hot('-a', { a: action });
        spyOn(apiService, 'getAdaptations').and.returnValue(
          cold('#|', null, ''),
        );
        expectObservable(effects.navAdaptations).toBe('-(bc)', {
          b: AppActions.setLoading({ loading: true }),
          c: AppActions.setLoading({ loading: false }),
        });
      });
    });
  });

  describe('navPlans', () => {
    it('should dispatch the appropriate actions when navigating to /plans', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = getRouterNavigatedAction('plans');
        actions = hot('-a', { a: action });
        expectObservable(effects.navPlans).toBe('-(bcde)', {
          b: AppActions.setLoading({ loading: true }),
          c: PlanningActions.getPlansSuccess({ plans }),
          d: PlanningActions.getAdaptationsSuccess({ adaptations }),
          e: AppActions.setLoading({ loading: false }),
        });
      });
    });

    it('should dispatch the appropriate actions when navigating to /plans and getPlansAndAdaptations fails', () => {
      testScheduler.run(({ cold, hot, expectObservable }) => {
        const action = getRouterNavigatedAction('plans');
        actions = hot('-a', { a: action });
        spyOn(apiService, 'getPlansAndAdaptations').and.returnValue(
          cold('#|', null, ''),
        );
        expectObservable(effects.navPlans).toBe('-(bc)', {
          b: AppActions.setLoading({ loading: true }),
          c: AppActions.setLoading({ loading: false }),
        });
      });
    });
  });

  describe('navPlansWithId', () => {
    it('should dispatch the appropriate actions when navigating to /plans/:id', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        const action = getRouterNavigatedAction(
          `plans/${planId}`,
          'plans/:id',
          { id: planId },
        );
        actions = hot('-a', { a: action });
        expectObservable(effects.navPlansWithId).toBe('-(bcde)', {
          b: AppActions.setLoading({ loading: true }),
          c: PlanningActions.updateAllUiStates({
            uiStates,
          }),
          d: PlanningActions.getPlanDetailSuccess({
            plan: planDetail,
          }),
          e: AppActions.setLoading({ loading: false }),
        });
      });
    });

    it(`should dispatch the appropriate actions when navigating to /plans/:id and getPlanDetail fails`, () => {
      testScheduler.run(({ cold, hot, expectObservable }) => {
        const action = getRouterNavigatedAction(
          `plans/${planId}`,
          'plans/:id',
          { id: planId },
        );
        actions = hot('-a', { a: action });
        spyOn(apiService, 'getPlanDetail').and.returnValue(
          cold('#|', null, ''),
        );
        expectObservable(effects.navPlansWithId).toBe('-(bcd)', {
          b: AppActions.setLoading({ loading: true }),
          c: PlanningActions.updateAllUiStates({
            uiStates,
          }),
          d: AppActions.setLoading({ loading: false }),
        });
      });
    });
  });
});
