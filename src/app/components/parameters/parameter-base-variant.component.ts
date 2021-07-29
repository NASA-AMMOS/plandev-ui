import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter as E,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { MaterialModule } from '../../material';
import { FormParameter, FormParameterChange } from '../../types';
import { ParameterNameModule } from './parameter-name.component';
import { parameterStyles } from './parameter-styles';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'parameter-base-variant',
  styles: [parameterStyles],
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
export class ParameterBaseVariantComponent {
  @Input() parameter: FormParameter | undefined;

  @Output() parameterChange: E<FormParameterChange> = new E();

  onParameterChange(change: MatSelectChange) {
    const { value: newValue } = change;
    this.parameterChange.emit({
      newValue,
      parameter: this.parameter,
      shouldValidate: true,
    });
  }
}

@NgModule({
  declarations: [ParameterBaseVariantComponent],
  exports: [ParameterBaseVariantComponent],
  imports: [CommonModule, MaterialModule, ParameterNameModule],
})
export class ParameterBaseVariantModule {}
