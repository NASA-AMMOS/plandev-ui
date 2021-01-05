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
  selector: 'parameter-rec-struct',
  styles: [activityInstanceFormParameterStyles],
  template: `
    <parameter-name [parameter]="parameter"></parameter-name>
    <div class="field">struct</div>
  `,
})
export class ActivityInstanceFormParameterRecStructComponent {
  @Input()
  parameter: ActivityInstanceFormParameter | undefined;
}

@NgModule({
  declarations: [ActivityInstanceFormParameterRecStructComponent],
  exports: [ActivityInstanceFormParameterRecStructComponent],
  imports: [
    CommonModule,
    MaterialModule,
    ActivityInstanceFormParameterNameModule,
  ],
})
export class ActivityInstanceFormParameterRecStructModule {}
