import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter as E,
  Input,
  NgModule,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { MaterialModule } from '../../material';
import { FormParameter, FormParameterChange } from '../../types';
import { ParameterNameModule } from './parameter-name.component';
import { parameterStyles } from './parameter-styles';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'parameter-base-path',
  styles: [
    parameterStyles,
    `
      .field {
        display: grid;
        gap: 15px;
        grid-template-columns: 40% auto;
      }
    `,
  ],
  template: `
    <parameter-name [parameter]="parameter"></parameter-name>
    <div class="field">
      <mat-form-field class="file-path" floatLabel="always">
        <mat-label>Path</mat-label>
        <input matInput disabled type="text" [value]="fileName" />
      </mat-form-field>
      <input type="file" (change)="onParameterChange($event)" />
    </div>
  `,
})
export class ParameterBasePathComponent implements OnChanges {
  @Input() parameter: FormParameter | undefined;

  @Output() parameterChange: E<FormParameterChange> = new E();

  fileName = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.parameter) {
      this.fileName = this.parameter.value;
    }
  }

  onParameterChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files.length) {
      const file = input.files.item(0);
      this.fileName = file.name;
      this.parameterChange.emit({
        newValue: this.fileName,
        parameter: this.parameter,
        shouldValidate: false,
      });
    }
  }
}

@NgModule({
  declarations: [ParameterBasePathComponent],
  exports: [ParameterBasePathComponent],
  imports: [CommonModule, MaterialModule, ParameterNameModule],
})
export class ParameterBasePathModule {}
