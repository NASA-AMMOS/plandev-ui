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
  selector: 'parameter-boolean',
  styles: activityInstanceFormParameterStyles,
  template: `
    <parameter-name [parameter]="parameter"></parameter-name>
    <div class="field">
      <mat-checkbox [checked]="parameter.value"></mat-checkbox>
    </div>
  `,
})
export class ActivityInstanceFormParameterBooleanComponent {
  @Input()
  parameter: ActivityInstanceFormParameter | undefined;
}

@NgModule({
  declarations: [ActivityInstanceFormParameterBooleanComponent],
  exports: [ActivityInstanceFormParameterBooleanComponent],
  imports: [
    CommonModule,
    MaterialModule,
    ActivityInstanceFormParameterNameModule,
  ],
})
export class ActivityInstanceFormParameterBooleanModule {}
