import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concat, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { MerlinActions, SimulationActions } from '../actions';
import { ApiService } from '../services';

@Injectable()
export class SimulationEffects {
  constructor(private actions: Actions, private apiService: ApiService) {}

  run = createEffect(() =>
    this.actions.pipe(
      ofType(SimulationActions.run),
      switchMap(() =>
        concat(
          of(MerlinActions.setLoading({ loading: true })),
          this.apiService.simulationRun().pipe(
            switchMap(stateBands => {
              return [SimulationActions.runSuccess({ stateBands })];
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
