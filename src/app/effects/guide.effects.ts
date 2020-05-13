import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { GuideActions } from '../actions';
import { GuideDialogComponent } from '../components/guide-dialog/guide-dialog.component';
import { Guide, GuideDialogData } from '../types';

@Injectable()
export class GuideEffects {
  constructor(private actions: Actions, private dialog: MatDialog) {}

  openGuideDialog = createEffect(() => {
    return this.actions.pipe(
      ofType(GuideActions.openGuideDialog),
      switchMap(({ data }) => {
        const guideDialog = this.dialog.open(GuideDialogComponent, {
          data,
          width: '300px',
        });
        return forkJoin<GuideDialogData, Guide | null>([
          of(data),
          guideDialog.afterClosed(),
        ]);
      }),
      map(([data, guide]) => ({ data, guide })),
      switchMap(({ data, guide }) => {
        if (guide && data.mode === 'create') {
          return [GuideActions.addOne({ guide })];
        } else if (guide && data.mode === 'edit') {
          return [GuideActions.updateOne({ id: guide.id, changes: guide })];
        } else {
          return [];
        }
      }),
    );
  });
}
