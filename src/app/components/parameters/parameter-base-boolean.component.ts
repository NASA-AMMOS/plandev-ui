import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter as E,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MaterialModule } from '../../material';
import { FormParameter, FormParameterChange } from '../../types';
import { ParameterNameModule } from './parameter-name.component';
import { parameterStyles } from './parameter-styles';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'parameter-base-boolean',
  styles: [parameterStyles],
  template: `
    <parameter-name [parameter]="parameter"></parameter-name>
    <div class="field">
      <mat-checkbox
        [checked]="parameter.value"
        (change)="onParameterChange($event)"
      ></mat-checkbox>
    </div>
  `,
})
export class ParameterBaseBooleanComponent {
  @Input() parameter: FormParameter | undefined;

  @Output() parameterChange: E<FormParameterChange> = new E();

  onParameterChange(change: MatCheckboxChange) {
    const { checked: newValue } = change;
    this.parameterChange.emit({ newValue, parameter: this.parameter });
  }
}

@NgModule({
  declarations: [ParameterBaseBooleanComponent],
  exports: [ParameterBaseBooleanComponent],
  imports: [CommonModule, MaterialModule, ParameterNameModule],
})
export class ParameterBaseBooleanModule {}
