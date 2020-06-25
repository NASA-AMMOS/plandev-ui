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
import uniqueId from 'lodash-es/uniqueId';
import { MaterialModule } from '../../material';
import { PipesModule } from '../../pipes';
import { Guide, GuideDialogData } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-guide-dialog',
  templateUrl: './guide-dialog.component.html',
})
export class GuideDialogComponent {
  form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<GuideDialogComponent>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: GuideDialogData,
  ) {
    const labelValidators = [
      Validators.required,
      Validators.minLength(1),
      Validators.maxLength(20),
    ];
    const positionValidators = [
      Validators.required,
      Validators.min(0),
      Validators.max(data.maxPosition),
    ];
    if (data.mode === 'edit' && data.guide) {
      this.form = this.fb.group({
        label: [data.guide.label.text, labelValidators],
        position: [data.guide.position, positionValidators],
      });
    } else {
      this.form = this.fb.group({
        label: ['', labelValidators],
        position: ['', positionValidators],
      });
    }
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  onSubmit() {
    if (this.form.valid) {
      const { bandId } = this.data;
      const { label: text, position } = this.form.value;
      if (this.data.mode === 'create') {
        const guide: Guide = {
          bandId,
          id: uniqueId('horizontalGuide'),
          label: { text },
          position,
          type: 'horizontal',
        };
        this.dialogRef.close(guide);
      } else if (this.data.mode === 'edit') {
        const guide: Guide = {
          ...this.data.guide,
          label: { text },
          position,
        };
        this.dialogRef.close(guide);
      }
    }
  }
}

@NgModule({
  declarations: [GuideDialogComponent],
  entryComponents: [GuideDialogComponent],
  exports: [GuideDialogComponent],
  imports: [CommonModule, MaterialModule, PipesModule, ReactiveFormsModule],
})
export class GuideDialogModule {}
