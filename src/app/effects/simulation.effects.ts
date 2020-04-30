import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import * as d3 from 'd3';
import { concat, of } from 'rxjs';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { AppActions, SimulationActions } from '../actions';
import { RootState } from '../app-store';
import { ApiService } from '../services';

@Injectable()
export class SimulationEffects {
  constructor(
    private actions: Actions,
    private apiService: ApiService,
    private store: Store<RootState>,
  ) {}

  /**
   * @note We are using a simple heuristic to calculate the sampling period.
   * First we use a scale to determine the spread between two consecutive time points
   * in the view time range.
   * Then we are dividing that time by 8 (arbitrarily) to get 8 samples within the range,
   * and then multiplying by 1000 to convert milliseconds to microseconds.
   */
  run = createEffect(() =>
    this.actions.pipe(
      ofType(SimulationActions.run),
      withLatestFrom(this.store),
      map(([action, state]) => ({ action, state })),
      switchMap(({ action, state }) => {
        const { start, end } = state.planning.viewTimeRange;
        const scale = d3.scaleTime().domain([new Date(start), new Date(end)]);
        const [t0, t1] = scale.ticks();
        const samplingPeriod = ((t1.getTime() - t0.getTime()) / 8) * 1000;
        return concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.simulate(action.planId, samplingPeriod).pipe(
            switchMap(results => {
              return [SimulationActions.runSuccess({ results })];
            }),
            catchError((error: Error) => {
              console.log(error.message);
              return [
                SimulationActions.runFailure({ errorMsg: error.message }),
              ];
            }),
          ),
          of(AppActions.setLoading({ loading: false })),
        );
      }),
    ),
  );
}
