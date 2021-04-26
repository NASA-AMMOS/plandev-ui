import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter as E,
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
  selector: 'parameter-base-input',
  styles: [activityInstanceFormParameterStyles],
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
      </mat-form-field>
    </div>
  `,
})
export class ActivityInstanceFormParameterBaseInputComponent {
  @Input() label: 'Integer' | 'Real Number' | 'String' | 'Duration';
  @Input() parameter: ActivityInstanceFormParameter | undefined;
  @Input() type: 'number' | 'text' = 'text';

  @Output() parameterChange: E<ActivityInstanceFormParameterChange> = new E();

  onParameterChange(event: Event) {
    const { value, valueAsNumber } = event.target as HTMLInputElement;
    let newValue: any = value || '';
    if (this.type === 'number') {
      if (valueAsNumber) {
        newValue = valueAsNumber;
      } else {
        // Server throws error if you send a string so we set to 0 here just in case.
        newValue = 0;
      }
    }
    this.parameterChange.emit({ newValue, parameter: this.parameter });
  }
}

@NgModule({
  declarations: [ActivityInstanceFormParameterBaseInputComponent],
  exports: [ActivityInstanceFormParameterBaseInputComponent],
  imports: [
    CommonModule,
    MaterialModule,
    ActivityInstanceFormParameterNameModule,
  ],
})
export class ActivityInstanceFormParameterBaseInputModule {}
