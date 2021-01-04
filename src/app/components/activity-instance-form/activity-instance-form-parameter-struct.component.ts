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
  selector: 'parameter-struct',
  styles: activityInstanceFormParameterStyles,
  template: `
    <parameter-name [parameter]="parameter"></parameter-name>
    <div class="field">
      <mat-form-field>
        <mat-label>Struct</mat-label>
      </mat-form-field>
    </div>
  `,
})
export class ActivityInstanceFormParameterStructComponent {
  @Input()
  parameter: ActivityInstanceFormParameter | undefined;
}

@NgModule({
  declarations: [ActivityInstanceFormParameterStructComponent],
  exports: [ActivityInstanceFormParameterStructComponent],
  imports: [
    CommonModule,
    MaterialModule,
    ActivityInstanceFormParameterNameModule,
  ],
})
export class ActivityInstanceFormParameterStructModule {}
