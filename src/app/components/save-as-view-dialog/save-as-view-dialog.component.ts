import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  NgModule,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '../../material';
import { View } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'save-as-view-dialog',
  styles: [
    `
      .header {
        align-items: center;
        display: flex;
        margin-bottom: 10px;
      }

      .header-left {
        align-items: center;
        display: flex;
        flex-grow: 1;
      }
    `,
  ],
  template: `
    <h1 class="header" mat-dialog-title>
      <div class="header-left">Save As View</div>
    </h1>

    <div mat-dialog-content>
      <form class="p-1" [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Name</mat-label>
          <input
            autocomplete="off"
            formControlName="name"
            matInput
            type="text"
            [required]="true"
          />
        </mat-form-field>

        <div class="buttons">
          <button
            class="mr-2"
            color="primary"
            mat-raised-button
            type="submit"
            [disabled]="form.invalid"
          >
            Save
          </button>

          <button type="button" mat-raised-button (click)="onCancel()">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `,
})
export class SaveAsViewDialogComponent {
  form: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<SaveAsViewDialogComponent>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: { view: View },
  ) {
    this.form = this.fb.group({
      name: [data.view.name, [Validators.required]],
    });
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  onSubmit() {
    if (this.form.valid) {
      const { name } = this.form.value;
      const newView: View = {
        ...this.data.view,
        name,
      };
      this.dialogRef.close(newView);
    }
  }
}

@NgModule({
  declarations: [SaveAsViewDialogComponent],
  entryComponents: [SaveAsViewDialogComponent],
  exports: [SaveAsViewDialogComponent],
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
})
export class SaveAsViewDialogModule {}
