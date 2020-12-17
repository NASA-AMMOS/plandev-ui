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
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import uniqueId from 'lodash-es/uniqueId';
import { SubSink } from 'subsink';
import { MaterialModule } from '../../material';
import { Axis, HorizontalGuide, HorizontalGuideEvent } from '../../types';

const labelValidators = [
  Validators.required,
  Validators.minLength(1),
  Validators.maxLength(20),
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'horizontal-guide-dialog',
  styles: [
    `
      .buttons {
        margin-top: 25px;
      }

      .mat-dialog-title {
        margin: 0;
      }
    `,
  ],
  templateUrl: './horizontal-guide-dialog.component.html',
})
export class HorizontalGuideDialogComponent implements OnDestroy {
  form: FormGroup;
  yAxisDomainHint: string | null = null;

  private subs = new SubSink();

  constructor(
    public dialogRef: MatDialogRef<HorizontalGuideDialogComponent>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: HorizontalGuideEvent,
  ) {
    const { guide, mode, yAxes = [] } = data;

    if (mode === 'edit' && guide) {
      const yAxis =
        yAxes.find((axis: Axis) => axis.id === guide.yAxisId) || null;
      this.setYAxisDomainHint(yAxis);
      this.form = this.fb.group({
        label: [guide.label.text, labelValidators],
        y: [guide.y, [Validators.required]],
        yAxis,
      });
    } else {
      const yAxis = yAxes[0] || null;
      this.setYAxisDomainHint(yAxis);
      this.form = this.fb.group({
        label: ['', labelValidators],
        y: ['', [Validators.required]],
        yAxis,
      });
    }

    this.subs.add(
      this.form.get('yAxis').valueChanges.subscribe((yAxis: Axis) => {
        this.setYAxisDomainHint(yAxis);
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  onSubmit() {
    if (this.form.valid) {
      const { mode, rowId } = this.data;
      const { label: text, y, yAxis } = this.form.value;

      if (mode === 'create') {
        const guide: HorizontalGuide = {
          id: uniqueId('horizontal-guide'),
          label: { text },
          rowId,
          y,
          yAxisId: yAxis?.id,
        };
        this.dialogRef.close(guide);
      } else if (mode === 'edit') {
        const guide: HorizontalGuide = {
          ...this.data.guide,
          label: { text },
          y,
          yAxisId: yAxis?.id,
        };
        this.dialogRef.close(guide);
      }
    }
  }

  setYAxisDomainHint(yAxis: Axis) {
    if (yAxis?.scaleDomain?.length) {
      const [a, b] = yAxis.scaleDomain;
      this.yAxisDomainHint = `Domain: [${a}, ${b}]`;
    } else {
      this.yAxisDomainHint = `Domain: None`;
    }
  }
}

@NgModule({
  declarations: [HorizontalGuideDialogComponent],
  entryComponents: [HorizontalGuideDialogComponent],
  exports: [HorizontalGuideDialogComponent],
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
})
export class HorizontalGuideDialogModule {}
