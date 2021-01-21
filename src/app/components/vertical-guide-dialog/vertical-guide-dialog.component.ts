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
import { doyTimestampValidator } from '../../functions';
import { MaterialModule } from '../../material';
import { VerticalGuide, VerticalGuideEvent } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'vertical-guide-dialog',
  templateUrl: './vertical-guide-dialog.component.html',
})
export class VerticalGuideDialogComponent {
  form: FormGroup;
  labelValidators = [
    Validators.required,
    Validators.minLength(1),
    Validators.maxLength(20),
  ];
  timestampValidators = [Validators.required, doyTimestampValidator];

  constructor(
    public dialogRef: MatDialogRef<VerticalGuideDialogComponent>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: VerticalGuideEvent,
  ) {
    const { guide, mode } = data;

    if (mode === 'edit' && guide) {
      this.form = this.fb.group({
        label: [guide.label.text, this.labelValidators],
        timestamp: [guide.timestamp, this.timestampValidators],
      });
    } else {
      this.form = this.fb.group({
        label: ['', this.labelValidators],
        timestamp: ['', this.timestampValidators],
      });
    }
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  onSubmit() {
    if (this.form.valid) {
      const { mode } = this.data;
      const { label: text, timestamp } = this.form.value;

      if (mode === 'create') {
        const guide: VerticalGuide = {
          id: uniqueId('vertical-guide'),
          label: { text },
          timestamp,
        };
        this.dialogRef.close(guide);
      } else if (mode === 'edit') {
        const guide: VerticalGuide = {
          ...this.data.guide,
          label: { text },
          timestamp,
        };
        this.dialogRef.close(guide);
      }
    }
  }
}

@NgModule({
  declarations: [VerticalGuideDialogComponent],
  entryComponents: [VerticalGuideDialogComponent],
  exports: [VerticalGuideDialogComponent],
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
})
export class VerticalGuideDialogModule {}
