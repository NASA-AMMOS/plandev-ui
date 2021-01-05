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
import { ActivityInstanceFormParameterBaseModule } from './activity-instance-form-parameter-base.component';
import { ActivityInstanceFormParameterRecSeriesModule } from './activity-instance-form-parameter-rec-series.component';
import { ActivityInstanceFormParameterRecStructModule } from './activity-instance-form-parameter-rec-struct.component';

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
      <parameter-base
        *ngIf="
          parameter.schema.type !== 'series' &&
          parameter.schema.type !== 'struct'
        "
        [parameter]="parameter"
        (parameterChange)="parameterChange.emit($event)"
      ></parameter-base>

      <parameter-rec-series
        *ngIf="parameter.schema.type === 'series'"
        [parameter]="parameter"
      ></parameter-rec-series>

      <parameter-rec-struct
        *ngIf="parameter.schema.type === 'struct'"
        [parameter]="parameter"
      ></parameter-rec-struct>

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
    ActivityInstanceFormParameterBaseModule,
    ActivityInstanceFormParameterRecSeriesModule,
    ActivityInstanceFormParameterRecStructModule,
  ],
})
export class ActivityInstanceFormParametersModule {}
