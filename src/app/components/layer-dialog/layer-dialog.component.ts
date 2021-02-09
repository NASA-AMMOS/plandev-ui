import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  NgModule,
  OnDestroy,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { SubSink } from 'subsink';
import { PlanningActions } from '../../actions';
import { RootState } from '../../app-store';
import { MaterialModule } from '../../material';
import { LayerEvent, XRangeLayer } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'layer-dialog',
  styles: [
    `
      .anchor {
        align-items: center;
        display: flex;
        justify-content: center;
      }

      .anchor:link,
      .anchor:visited {
        color: rgba(0, 0, 0, 0.6);
        text-decoration: none;
      }

      .handle {
        color: rgba(0, 0, 0, 0.6);
        cursor: move;
      }

      .header {
        align-items: center;
        display: flex;
      }

      .header-left {
        align-items: center;
        display: flex;
        flex-grow: 1;
      }

      .header-right {
        align-items: center;
        display: flex;
      }
    `,
  ],
  template: `
    <h1
      cdkDrag
      cdkDragRootElement=".cdk-overlay-pane"
      cdkDragHandle
      class="header"
      mat-dialog-title
    >
      <div class="header-left">
        <mat-icon class="pr-1 handle">drag_handle</mat-icon>
        {{ data.mode === 'create' ? 'Create' : 'Edit' }} Layer
      </div>
      <div class="header-right">
        <button mat-icon-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </h1>

    <div mat-dialog-content>
      <form class="p-1" [formGroup]="form">
        <mat-form-field
          *ngIf="data.mode === 'edit'"
          appearance="outline"
          class="w-100"
        >
          <mat-label>Chart Type</mat-label>
          <input matInput formControlName="chartType" />
          <mat-icon matSuffix>lock</mat-icon>
        </mat-form-field>

        <mat-form-field
          *ngIf="data.layer.chartType === 'x-range'"
          appearance="outline"
          class="w-100 pb-3"
        >
          <mat-label>Color Scheme</mat-label>
          <mat-select formControlName="colorScheme">
            <mat-option
              *ngFor="let colorScheme of xRangeColorSchemes"
              [value]="colorScheme.value"
            >
              {{ colorScheme.name }}
            </mat-option>
          </mat-select>
          <mat-hint>
            <a
              class="anchor"
              href="https://github.com/d3/d3-scale-chromatic#categorical"
              rel="noopener noreferrer"
              target="_blank"
            >
              Documentation
              <mat-icon class="pl-1">open_in_new</mat-icon>
            </a>
          </mat-hint>
        </mat-form-field>
      </form>
    </div>
  `,
})
export class LayerDialogComponent implements OnDestroy {
  form: FormGroup;
  xRangeColorSchemes = [
    { name: 'Accent', value: 'schemeAccent' },
    { name: 'Category 10', value: 'schemeCategory10' },
    { name: 'Dark 2', value: 'schemeDark2' },
    { name: 'Paired', value: 'schemePaired' },
    { name: 'Pastel 1', value: 'schemePastel1' },
    { name: 'Pastel 2', value: 'schemePastel2' },
    { name: 'Set 1', value: 'schemeSet1' },
    { name: 'Set 2', value: 'schemeSet2' },
    { name: 'Set 3', value: 'schemeSet3' },
    { name: 'Tableau 10', value: 'schemeTableau10' },
  ];

  private subs = new SubSink();

  constructor(
    public dialogRef: MatDialogRef<LayerDialogComponent>,
    private fb: FormBuilder,
    private store: Store<RootState>,
    @Inject(MAT_DIALOG_DATA) public data: LayerEvent,
  ) {
    const { layer, mode, rowId } = data;

    if (mode === 'edit' && layer) {
      this.form = this.fb.group({
        chartType: [{ disabled: true, value: layer.chartType }],
      });

      if (layer.chartType === 'x-range') {
        const xRangeLayer: XRangeLayer = layer;
        this.form.addControl(
          'colorScheme',
          new FormControl(xRangeLayer.colorScheme),
        );
      }

      this.subs.add(
        this.form.valueChanges.subscribe(newValue => {
          const newLayer = {
            ...layer,
            ...newValue,
          };
          this.store.dispatch(
            PlanningActions.layerUpdate({ layer: newLayer, rowId }),
          );
        }),
      );
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  onCancel() {
    this.dialogRef.close(null);
  }
}

@NgModule({
  declarations: [LayerDialogComponent],
  entryComponents: [LayerDialogComponent],
  exports: [LayerDialogComponent],
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
})
export class LayerDialogModule {}
