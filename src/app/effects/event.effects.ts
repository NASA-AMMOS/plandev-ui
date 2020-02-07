import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap } from 'rxjs/operators';
import { EventActions } from '../actions';

@Injectable()
export class EventEffects {
  constructor(private actions: Actions) {}

  resize = createEffect(
    () =>
      this.actions.pipe(
        ofType(EventActions.resize),
        switchMap(() => {
          setTimeout(() => dispatchEvent(new Event('resize')));
          return [];
        }),
      ),
    { dispatch: false },
  );
}
