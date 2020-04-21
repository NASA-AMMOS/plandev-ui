import { HttpClientModule } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, Observer } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { AppActions, SimulationActions } from '../actions';
import { planId, simulationResults } from '../mocks';
import { ApiMockService, ApiService } from '../services';
import { SimulationResult } from '../types';
import { SimulationEffects } from './simulation.effects';

describe('simulation effects', () => {
  let actions: Observable<Action>;
  let apiService: ApiService;
  let effects: SimulationEffects;
  let testScheduler: TestScheduler;
  const initialState = {
    planning: { viewTimeRange: { end: 1735689600000, start: 1577836800000 } },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [
        SimulationEffects,
        provideMockActions(() => actions),
        provideMockStore({ initialState }),
        {
          provide: ApiService,
          useValue: new ApiMockService(),
        },
      ],
    });
    apiService = TestBed.inject(ApiService);
    actions = TestBed.inject(Actions);
    effects = TestBed.inject(SimulationEffects);
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  describe('run', () => {
    it('should dispatch the appropriate actions when successfully running a simulation', () => {
      testScheduler.run(({ hot, expectObservable }) => {
        spyOn(apiService, 'simulate').and.returnValue(
          new Observable((o: Observer<SimulationResult[]>) => {
            o.next(simulationResults);
            o.complete();
          }),
        );
        const action = SimulationActions.run({ planId });
        actions = hot('-a', { a: action });
        expectObservable(effects.run).toBe('-(bcd)', {
          b: AppActions.setLoading({ loading: true }),
          c: SimulationActions.runSuccess({ results: simulationResults }),
          d: AppActions.setLoading({ loading: false }),
        });
      });
    });

    it('should dispatch the appropriate actions when failing to run a simulation', () => {
      testScheduler.run(({ cold, hot, expectObservable }) => {
        const error = new Error('Simulation failed');
        const action = SimulationActions.run({ planId });
        actions = hot('-a', { a: action });
        spyOn(apiService, 'simulate').and.returnValue(cold('#|', null, error));
        expectObservable(effects.run).toBe('-(bcd)', {
          b: AppActions.setLoading({ loading: true }),
          c: SimulationActions.runFailure({ errorMsg: error.message }),
          d: AppActions.setLoading({ loading: false }),
        });
      });
    });
  });
});
