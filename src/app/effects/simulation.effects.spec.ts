import { HttpClientModule } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { MerlinActions, SimulationActions } from '../actions';
import { getSimulationRunBands } from '../mocks';
import { ApiMockService, ApiService } from '../services';
import { SimulationEffects } from './simulation.effects';

describe('simulation effects', () => {
  let actions: Observable<Action>;
  let apiService: ApiService;
  let effects: SimulationEffects;
  let testScheduler: TestScheduler;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [
        SimulationEffects,
        provideMockActions(() => actions),
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
        const stateBands = getSimulationRunBands();
        const action = SimulationActions.run();
        actions = hot('-a', { a: action });
        expectObservable(effects.run).toBe('-(bcd)', {
          b: MerlinActions.setLoading({ loading: true }),
          c: SimulationActions.runSuccess({ stateBands }),
          d: MerlinActions.setLoading({ loading: false }),
        });
      });
    });

    it('should dispatch the appropriate actions when failing to run a simulation', () => {
      testScheduler.run(({ cold, hot, expectObservable }) => {
        const errorMsg = 'Simulation failed';
        const action = SimulationActions.run();
        actions = hot('-a', { a: action });
        spyOn(apiService, 'simulationRun').and.returnValue(
          cold('#|', null, errorMsg),
        );
        expectObservable(effects.run).toBe('-(bcd)', {
          b: MerlinActions.setLoading({ loading: true }),
          c: SimulationActions.runFailure({ errorMsg }),
          d: MerlinActions.setLoading({ loading: false }),
        });
      });
    });
  });
});
