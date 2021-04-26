import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { MaterialModule } from '../../material';
import {
  ActivityInstanceFormParameter,
  ActivityInstanceFormParameterChange,
} from '../../types';
import { ActivityInstanceFormParameterNameModule } from './activity-instance-form-parameter-name.component';
import { activityInstanceFormParameterStyles } from './shared-styles';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'parameter-base-variant',
  styles: [activityInstanceFormParameterStyles],
  template: `
    <parameter-name [parameter]="parameter"></parameter-name>
    <div class="field">
      <mat-form-field>
        <mat-label>Variant</mat-label>
        <mat-select
          [value]="parameter.value"
          (selectionChange)="onParameterChange($event)"
        >
          <mat-option
            *ngFor="let variant of parameter.schema.variants"
            [value]="variant.key"
          >
            {{ variant.label }}
          </mat-option>
        </mat-select>
      </mat-form-field>
    </div>
  `,
})
export class ActivityInstanceFormParameterBaseVariantComponent {
  @Input() parameter: ActivityInstanceFormParameter | undefined;

  @Output()
  parameterChange: EventEmitter<ActivityInstanceFormParameterChange> = new EventEmitter();

  onParameterChange(change: MatSelectChange) {
    const { value: newValue } = change;
    this.parameterChange.emit({ newValue, parameter: this.parameter });
  }
}

@NgModule({
  declarations: [ActivityInstanceFormParameterBaseVariantComponent],
  exports: [ActivityInstanceFormParameterBaseVariantComponent],
  imports: [
    CommonModule,
    MaterialModule,
    ActivityInstanceFormParameterNameModule,
  ],
})
export class ActivityInstanceFormParameterBaseVariantModule {}
