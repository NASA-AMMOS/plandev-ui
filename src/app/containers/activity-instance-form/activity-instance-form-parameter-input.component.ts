import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import { MaterialModule } from '../../material';
import {
  ActivityInstanceFormParameter,
  ActivityInstanceFormParameterChange,
} from '../../types';
import { ActivityInstanceFormParameterNameModule } from './activity-instance-form-parameter-name.component';
import { activityInstanceFormParameterStyles } from './shared-styles';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'parameter-input',
  styles: activityInstanceFormParameterStyles,
  template: `
    <parameter-name [parameter]="parameter"></parameter-name>
    <div class="field">
      <mat-form-field floatLabel="always">
        <mat-label>{{ label }}</mat-label>
        <input
          matInput
          [type]="type"
          [value]="parameter.value"
          (change)="onParameterChange($event)"
        />
        <mat-progress-spinner
          *ngIf="parameter.loading"
          matSuffix
          color="primary"
          diameter="20"
          mode="indeterminate"
        >
        </mat-progress-spinner>
        <mat-hint class="error-hint" *ngIf="parameter.error">
          {{ parameter.error }}
        </mat-hint>
      </mat-form-field>
    </div>
  `,
})
export class ActivityInstanceFormParameterInputComponent {
  @Input()
  label: 'Integer' | 'Real Number' | 'String' | 'Duration';

  @Input()
  parameter: ActivityInstanceFormParameter | undefined;

  @Input()
  type: 'number' | 'text' = 'text';

  @Output()
  parameterChange: EventEmitter<ActivityInstanceFormParameterChange> = new EventEmitter<ActivityInstanceFormParameterChange>();

  onParameterChange(event: Event) {
    const { value, valueAsNumber } = event.target as HTMLInputElement;
    let newValue: any = value || '';
    if (this.type === 'number' && valueAsNumber) {
      newValue = valueAsNumber;
    }
    this.parameterChange.emit({ newValue, parameter: this.parameter });
  }
}

@NgModule({
  declarations: [ActivityInstanceFormParameterInputComponent],
  exports: [ActivityInstanceFormParameterInputComponent],
  imports: [
    CommonModule,
    MaterialModule,
    ActivityInstanceFormParameterNameModule,
  ],
})
export class ActivityInstanceFormParameterInputModule {}
