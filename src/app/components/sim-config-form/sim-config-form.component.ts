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
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import keyBy from 'lodash-es/keyBy';
import { MaterialModule } from '../../material';
import {
  FormParameter,
  FormParameterChange,
  Parameter,
  ParameterSchema,
  StringTMap,
} from '../../types';
import { ParametersModule } from '../parameters/parameters.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'sim-config-form',
  templateUrl: './sim-config-form.component.html',
})
export class SimConfigFormComponent implements OnChanges {
  @Input() configParamSchemas: ParameterSchema[];
  @Input() configParams: Parameter[];

  @Output() update: E<FormParameter[]> = new E();

  configParamsMap: StringTMap<Parameter>;
  formParameters: FormParameter[];

  ngOnChanges(changes: SimpleChanges) {
    if (changes.configParams) {
      this.configParamsMap = keyBy(this.configParams, 'name');
    }

    if (changes.configParamSchemas || changes.configParams) {
      this.formParameters = this.getFormParameters();
    }
  }

  getFormParameters(): FormParameter[] {
    const formParameters = this.configParamSchemas.map(({ name, schema }) => {
      let value = null;

      const parameter = this.configParamsMap[name];

      if (parameter) {
        value = parameter.value;
      } else if (schema.type === 'boolean') {
        value = false;
      } else if (schema.type === 'duration') {
        value = 0;
      } else if (schema.type === 'int') {
        value = 0;
      } else if (schema.type === 'path') {
        value = '/etc/os-release';
      } else if (schema.type === 'real') {
        value = 0;
      } else if (schema.type === 'series') {
        value = [];
      } else if (schema.type === 'string') {
        value = '';
      } else if (schema.type === 'struct') {
        value = {};
      } else if (schema.type === 'variant') {
        value = '';
      }

      const formParameter: FormParameter = {
        error: null,
        loading: false,
        name,
        schema,
        value,
      };

      return formParameter;
    });

    return formParameters;
  }

  onFormParameterChange(change: FormParameterChange) {
    this.formParameters = this.formParameters.map(formParameter => {
      if (formParameter.name === change.parameter.name) {
        const updatedFormParameter = {
          ...formParameter,
          file: change.file || null,
          value: change.newValue,
        };

        return updatedFormParameter;
      }
      return formParameter;
    });
  }

  onUpdate() {
    this.update.emit(this.formParameters);
  }
}

@NgModule({
  declarations: [SimConfigFormComponent],
  exports: [SimConfigFormComponent],
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    ReactiveFormsModule,
    ParametersModule,
  ],
})
export class SimConfigFormModule {}
