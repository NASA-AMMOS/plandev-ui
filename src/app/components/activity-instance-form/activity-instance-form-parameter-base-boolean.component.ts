import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  NgModule,
} from '@angular/core';
import { MaterialModule } from '../../material';
import { ActivityInstanceFormParameter } from '../../types';
import { ActivityInstanceFormParameterNameModule } from './activity-instance-form-parameter-name.component';
import { activityInstanceFormParameterStyles } from './shared-styles';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'parameter-base-boolean',
  styles: [activityInstanceFormParameterStyles],
  template: `
    <parameter-name [parameter]="parameter"></parameter-name>
    <div class="field">
      <mat-checkbox [checked]="parameter.value"></mat-checkbox>
    </div>
  `,
})
export class ActivityInstanceFormParameterBaseBooleanComponent {
  @Input()
  parameter: ActivityInstanceFormParameter | undefined;
}

@NgModule({
  declarations: [ActivityInstanceFormParameterBaseBooleanComponent],
  exports: [ActivityInstanceFormParameterBaseBooleanComponent],
  imports: [
    CommonModule,
    MaterialModule,
    ActivityInstanceFormParameterNameModule,
  ],
})
export class ActivityInstanceFormParameterBaseBooleanModule {}
