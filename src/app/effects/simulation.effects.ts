import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { concat, of } from 'rxjs';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { MerlinActions, SimulationActions } from '../actions';
import { AppState } from '../app-store';
import { getLineBand, getXRangeBand } from '../mocks';
import { ApiService } from '../services';

@Injectable()
export class SimulationEffects {
  constructor(
    private actions: Actions,
    private apiService: ApiService,
    private store: Store<AppState>,
  ) {}

  run = createEffect(() =>
    this.actions.pipe(
      ofType(SimulationActions.run),
      withLatestFrom(this.store),
      map(([_, state]) => state),
      switchMap(state =>
        concat(
          of(MerlinActions.setLoading({ loading: true })),
          this.apiService.simulationRun().pipe(
            switchMap(() => {
              return [
                SimulationActions.runSuccess({
                  stateBands: {
                    ...getLineBand(state.merlin.selectedPlan),
                    ...getXRangeBand(state.merlin.selectedPlan),
                  },
                }),
              ];
            }),
            catchError((errorMsg: string) => {
              console.log(errorMsg);
              return [SimulationActions.runFailure({ errorMsg })];
            }),
          ),
          of(MerlinActions.setLoading({ loading: false })),
        ),
      ),
    ),
  );
}
