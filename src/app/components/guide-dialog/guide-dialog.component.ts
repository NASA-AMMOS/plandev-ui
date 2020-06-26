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

const labelValidators = [
  Validators.required,
  Validators.minLength(1),
  Validators.maxLength(20),
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-guide-dialog',
  styleUrls: ['./guide-dialog.component.css'],
  templateUrl: './guide-dialog.component.html',
})
export class GuideDialogComponent {
  form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<GuideDialogComponent>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: GuideDialogData,
  ) {
    if (data.mode === 'edit' && data.guide) {
      if (data.type === 'horizontal') {
        this.form = this.fb.group({
          label: [data.guide.label.text, labelValidators],
          y: [data.guide.y, [Validators.required]],
          yAxis:
            data?.yAxes.find(axis => axis.id === data.guide.yAxisId) || null,
        });
      } else if (data.type === 'vertical') {
        // TODO.
      }
    } else {
      if (data.type === 'horizontal') {
        this.form = this.fb.group({
          label: ['', labelValidators],
          y: ['', [Validators.required]],
          yAxis: data?.yAxes[0] || null,
        });
      } else if (data.type === 'vertical') {
        // TODO.
      }
    }
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  onSubmit() {
    if (this.form.valid) {
      const { bandId } = this.data;
      if (this.data.type === 'horizontal') {
        const { label: text, y, yAxis } = this.form.value;
        if (this.data.mode === 'create') {
          const guide: Guide = {
            bandId,
            id: uniqueId('horizontalGuide'),
            label: { text },
            type: 'horizontal',
            y,
            yAxisId: yAxis?.id,
          };
          this.dialogRef.close(guide);
        } else if (this.data.mode === 'edit') {
          const guide: Guide = {
            ...this.data.guide,
            label: { text },
            y,
            yAxisId: yAxis?.id,
          };
          this.dialogRef.close(guide);
        }
      } else if (this.data.type === 'vertical') {
        // TODO.
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
