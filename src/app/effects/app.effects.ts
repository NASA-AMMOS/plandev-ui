import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap } from 'rxjs/operators';
import { version } from '../../environments/version';
import { AppActions } from '../actions';
import { AboutDialogComponent } from '../components';

@Injectable()
export class AppEffects {
  constructor(private actions: Actions, private dialog: MatDialog) {}

  openAboutDialog = createEffect(
    () =>
      this.actions.pipe(
        ofType(AppActions.openAboutDialog),
        switchMap(() => {
          this.dialog.open(AboutDialogComponent, {
            data: version,
            width: `500px`,
          });
          return [];
        }),
      ),
    { dispatch: false },
  );

  resize = createEffect(
    () =>
      this.actions.pipe(
        ofType(AppActions.resize),
        switchMap(() => {
          setTimeout(() => dispatchEvent(new Event('resize')));
          return [];
        }),
      ),
    { dispatch: false },
  );
}
