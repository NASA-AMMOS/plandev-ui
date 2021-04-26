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
import { ActivityInstanceFormParameterBaseModule } from './activity-instance-form-parameter-base.component';
import { ActivityInstanceFormParameterRecModule } from './activity-instance-form-parameter-rec.component';

/**
 * @see https://wiki.jpl.nasa.gov/pages/viewpage.action?spaceKey=MPSA&title=Merlin+ValueSchema+Definitions
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'activity-instance-form-parameters',
  styles: [
    `
      .error {
        font-size: 12px;
        margin-bottom: 0;
        margin-top: 10px;
      }
    `,
  ],
  template: `
    <ng-container
      *ngFor="
        let parameter of parameters;
        trackBy: trackByParameters;
        let i = index
      "
    >
      <div *ngIf="parameter.error" class="alert alert-danger error">
        {{ parameter.error }}
      </div>

      <parameter-base
        *ngIf="
          parameter.schema.type !== 'series' &&
          parameter.schema.type !== 'struct'
        "
        [parameter]="parameter"
        (parameterChange)="parameterChange.emit($event)"
      ></parameter-base>

      <parameter-rec
        *ngIf="
          parameter.schema.type === 'series' ||
          parameter.schema.type === 'struct'
        "
        [parameter]="parameter"
        (parameterChange)="parameterChange.emit($event)"
      ></parameter-rec>

      <mat-divider *ngIf="i !== parameters?.length - 1"></mat-divider>
    </ng-container>
  `,
})
export class ActivityInstanceFormParametersComponent {
  @Input() parameters: ActivityInstanceFormParameter[] | undefined;

  @Output() parameterChange: E<ActivityInstanceFormParameterChange> = new E();

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
    ActivityInstanceFormParameterRecModule,
  ],
})
export class ActivityInstanceFormParametersModule {}
