import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter as E,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import { FormParameter, FormParameterChange } from '../../types';
import { ParameterBaseBooleanModule } from './parameter-base-boolean.component';
import { ParameterBaseInputModule } from './parameter-base-input.component';
import { ParameterBaseVariantModule } from './parameter-base-variant.component';

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
export class ParameterBaseComponent {
  @Input() parameter: FormParameter | undefined;

  @Output() parameterChange: E<FormParameterChange> = new E();
}

@NgModule({
  declarations: [ParameterBaseComponent],
  exports: [ParameterBaseComponent],
  imports: [
    CommonModule,
    ParameterBaseBooleanModule,
    ParameterBaseInputModule,
    ParameterBaseVariantModule,
  ],
})
export class ParameterBaseModule {}
