import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concat, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AppActions, SimulationActions } from '../actions';
import { ApiService } from '../services';

@Injectable()
export class SimulationEffects {
  constructor(private actions: Actions, private apiService: ApiService) {}

  run = createEffect(() =>
    this.actions.pipe(
      ofType(SimulationActions.run),
      switchMap(({ planId }) =>
        concat(
          of(AppActions.setLoading({ loading: true })),
          this.apiService.simulate(planId).pipe(
            switchMap(results => {
              return [SimulationActions.runSuccess({ results })];
            }),
            catchError((error: Error) => {
              console.log(error);
              return [
                SimulationActions.runFailure({ errorMsg: error.message }),
              ];
            }),
          ),
          of(AppActions.setLoading({ loading: false })),
        ),
      ),
    ),
  );
}
