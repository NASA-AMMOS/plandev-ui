import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map, mergeMap, withLatestFrom } from 'rxjs/operators';
import { TimelineActions } from '../actions';
import { RootState } from '../app-store';
import { getUnixEpochTime } from '../functions';
import { TimeRange } from '../types';

@Injectable()
export class TimelineEffects {
  constructor(private actions: Actions, private store: Store<RootState>) {}

  restoreViewTimeRange = createEffect(() =>
    this.actions.pipe(
      ofType(TimelineActions.restoreViewTimeRange),
      withLatestFrom(this.store),
      map(([_, state]) => state),
      mergeMap(({ planning: { selectedPlan } }) => {
        const viewTimeRange: TimeRange = {
          end: getUnixEpochTime(selectedPlan.endTimestamp),
          start: getUnixEpochTime(selectedPlan.startTimestamp),
        };
        return [TimelineActions.updateViewTimeRange({ viewTimeRange })];
      }),
    ),
  );
}
