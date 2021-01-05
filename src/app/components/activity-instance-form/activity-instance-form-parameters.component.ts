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
import { ActivityInstanceFormParameterBooleanModule } from './activity-instance-form-parameter-boolean.component';
import { ActivityInstanceFormParameterInputModule } from './activity-instance-form-parameter-input.component';
import { ActivityInstanceFormParameterNameModule } from './activity-instance-form-parameter-name.component';
import { ActivityInstanceFormParameterSeriesModule } from './activity-instance-form-parameter-series.component';
import { ActivityInstanceFormParameterStructModule } from './activity-instance-form-parameter-struct.component';
import { ActivityInstanceFormParameterVariantModule } from './activity-instance-form-parameter-variant.component';

/**
 * @see https://wiki.jpl.nasa.gov/pages/viewpage.action?spaceKey=MPSA&title=Merlin+ValueSchema+Definitions
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'activity-instance-form-parameters',
  template: `
    <ng-container
      *ngFor="
        let parameter of parameters;
        trackBy: trackByParameters;
        let i = index
      "
    >
      <parameter-boolean
        *ngIf="parameter.schema.type === 'boolean'"
        [parameter]="parameter"
      ></parameter-boolean>

      <parameter-input
        *ngIf="parameter.schema.type === 'duration'"
        label="Duration"
        type="text"
        [parameter]="parameter"
        (parameterChange)="parameterChange.emit($event)"
      ></parameter-input>

      <parameter-input
        *ngIf="parameter.schema.type === 'int'"
        label="Integer"
        type="number"
        [parameter]="parameter"
        (parameterChange)="parameterChange.emit($event)"
      ></parameter-input>

      <parameter-input
        *ngIf="parameter.schema.type === 'real'"
        label="Real Number"
        type="number"
        [parameter]="parameter"
        (parameterChange)="parameterChange.emit($event)"
      ></parameter-input>

      <parameter-series
        *ngIf="parameter.schema.type === 'series'"
        [parameter]="parameter"
      ></parameter-series>

      <parameter-input
        *ngIf="parameter.schema.type === 'string'"
        label="String"
        type="text"
        [parameter]="parameter"
        (parameterChange)="parameterChange.emit($event)"
      ></parameter-input>

      <parameter-struct
        *ngIf="parameter.schema.type === 'struct'"
        [parameter]="parameter"
      ></parameter-struct>

      <parameter-variant
        *ngIf="parameter.schema.type === 'variant'"
        [parameter]="parameter"
      ></parameter-variant>

      <mat-divider *ngIf="i !== parameters?.length - 1"></mat-divider>
    </ng-container>
  `,
})
export class ActivityInstanceFormParametersComponent {
  @Input()
  parameters: ActivityInstanceFormParameter[] | undefined;

  @Output()
  parameterChange: EventEmitter<ActivityInstanceFormParameterChange> = new EventEmitter<ActivityInstanceFormParameterChange>();

  trackByParameters(_: number, parameter: ActivityInstanceFormParameter) {
    return parameter.name;
  }
}

@NgModule({
  declarations: [ActivityInstanceFormParametersComponent],
  exports: [ActivityInstanceFormParametersComponent],
  imports: [
    CommonModule,
    MaterialModule,
    ActivityInstanceFormParameterBooleanModule,
    ActivityInstanceFormParameterInputModule,
    ActivityInstanceFormParameterNameModule,
    ActivityInstanceFormParameterSeriesModule,
    ActivityInstanceFormParameterStructModule,
    ActivityInstanceFormParameterVariantModule,
  ],
})
export class ActivityInstanceFormParametersModule {}
