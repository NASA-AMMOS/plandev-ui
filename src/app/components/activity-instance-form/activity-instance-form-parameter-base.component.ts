import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import {
  ActivityInstanceFormParameter,
  ActivityInstanceFormParameterChange,
} from '../../types';
import { ActivityInstanceFormParameterBaseBooleanModule } from './activity-instance-form-parameter-base-boolean.component';
import { ActivityInstanceFormParameterBaseInputModule } from './activity-instance-form-parameter-base-input.component';
import { ActivityInstanceFormParameterBaseVariantModule } from './activity-instance-form-parameter-base-variant.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'parameter-base',
  template: `
    <parameter-base-boolean
      *ngIf="parameter.schema.type === 'boolean'"
      [parameter]="parameter"
      (parameterChange)="parameterChange.emit($event)"
    ></parameter-base-boolean>

    <parameter-base-input
      *ngIf="parameter.schema.type === 'duration'"
      label="Duration"
      type="number"
      [parameter]="parameter"
      (parameterChange)="parameterChange.emit($event)"
    ></parameter-base-input>

    <parameter-base-input
      *ngIf="parameter.schema.type === 'int'"
      label="Integer"
      type="number"
      [parameter]="parameter"
      (parameterChange)="parameterChange.emit($event)"
    ></parameter-base-input>

    <parameter-base-input
      *ngIf="parameter.schema.type === 'real'"
      label="Real Number"
      type="number"
      [parameter]="parameter"
      (parameterChange)="parameterChange.emit($event)"
    ></parameter-base-input>

    <parameter-base-input
      *ngIf="parameter.schema.type === 'string'"
      label="String"
      type="text"
      [parameter]="parameter"
      (parameterChange)="parameterChange.emit($event)"
    ></parameter-base-input>

    <parameter-base-variant
      *ngIf="parameter.schema.type === 'variant'"
      [parameter]="parameter"
      (parameterChange)="parameterChange.emit($event)"
    ></parameter-base-variant>
  `,
})
export class ActivityInstanceFormParameterBaseComponent {
  @Input() parameter: ActivityInstanceFormParameter | undefined;

  @Output()
  parameterChange: EventEmitter<ActivityInstanceFormParameterChange> = new EventEmitter();
}

@NgModule({
  declarations: [ActivityInstanceFormParameterBaseComponent],
  exports: [ActivityInstanceFormParameterBaseComponent],
  imports: [
    CommonModule,
    ActivityInstanceFormParameterBaseBooleanModule,
    ActivityInstanceFormParameterBaseInputModule,
    ActivityInstanceFormParameterBaseVariantModule,
  ],
})
export class ActivityInstanceFormParameterBaseModule {}
