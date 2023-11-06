import { isEqual, omitBy } from 'lodash-es';
import type {
  Argument,
  ArgumentsMap,
  FormParameter,
  ParametersMap,
  RequiredParametersList,
  ValueSource,
} from '../types/parameter';
import type { ValueSchema } from '../types/schema';
import { isEmpty } from './generic';

/**
 * Derive argument given input value, value schema, and optional default value.
 * Returns the derived value and the source of the value which follows this logic:
 * if the value is not null or undefined: "user"
 * else if the default value is not undefined: "mission"
 * otherwise there is no value so there is no value source: "none"
 */
export function getArgument(
  value: Argument,
  schema: ValueSchema,
  presetValue?: Argument,
  defaultValue?: Argument,
): { value: any; valueSource: ValueSource } {
  const type = schema.type;

  if (value !== null && value !== undefined) {
    if (presetValue === undefined) {
      return { value, valueSource: 'user on model' };
    } else {
      if (isEqual(value, presetValue)) {
        return { value, valueSource: 'preset' };
      }
      return { value, valueSource: 'user on preset' };
    }
  } else if ((value === null || value === undefined) && presetValue !== undefined) {
    return { value: presetValue, valueSource: 'preset' };
  } else if (defaultValue !== undefined) {
    return { value: defaultValue, valueSource: 'mission' };
  } else if (type === 'series') {
    return { value: [], valueSource: 'none' };
  } else if (type === 'struct') {
    const struct = Object.entries(schema.items).reduce((struct, [key, subSchema]) => {
      const { value } = getArgument(null, subSchema);
      return { ...struct, [key]: value };
    }, {});
    return { value: struct, valueSource: 'none' };
  } else {
    return { value: null, valueSource: 'none' };
  }
}

export function getArguments(argumentsMap: ArgumentsMap, formParameter: FormParameter): ArgumentsMap {
  const { name, value } = formParameter;
  const newArgument = { [name]: value };
  return omitBy({ ...argumentsMap, ...newArgument }, isEmpty);
}

export function getFormParameters(
  parametersMap: ParametersMap,
  argumentsMap: ArgumentsMap,
  requiredParameters: RequiredParametersList,
  presetArgumentsMap: ArgumentsMap = {},
  defaultArgumentsMap: ArgumentsMap = {},
): FormParameter[] {
  const formParameters = Object.entries(parametersMap).map(([name, { order, schema }]) => {
    const arg: Argument = argumentsMap[name];
    const preset: Argument = presetArgumentsMap[name];
    const defaultArg: Argument | undefined = defaultArgumentsMap[name];
    const { value, valueSource } = getArgument(arg, schema, preset, defaultArg);
    const required = requiredParameters.indexOf(name) > -1;

    const formParameter: FormParameter = {
      errors: null,
      name,
      order,
      required,
      schema,
      value,
      valueSource,
    };

    return formParameter;
  });

  return formParameters;
}

/**
 * Returns a boolean for whether or not the provided parameter is recursive
 */
export function isRecParameter(parameter: FormParameter) {
  return parameter.schema.type === 'series' || parameter.schema.type === 'struct';
}

/**
 * Returns a default value for a given value schema.
 */
export function getValueSchemaDefaultValue(schema: ValueSchema): any {
  if (schema.type === 'boolean') {
    return false;
  } else if (schema.type === 'duration') {
    return 0;
  } else if (schema.type === 'int') {
    return 0;
  } else if (schema.type === 'path') {
    return '';
  } else if (schema.type === 'real') {
    return 0;
  } else if (schema.type === 'series') {
    const seriesValue = getValueSchemaDefaultValue(schema.items);
    return [seriesValue];
  } else if (schema.type === 'struct') {
    const struct = Object.entries(schema.items).reduce((struct, [key, subSchema]) => {
      const value = getValueSchemaDefaultValue(subSchema);
      return { ...struct, [key]: value };
    }, {});
    return struct;
  } else if (schema.type === 'string') {
    return '';
  } else if (schema.type === 'variant') {
    const variant = schema.variants.length ? schema.variants[0].key : '';
    return variant;
  } else {
    throw new Error('Cannot get a default value for given value schema');
  }
}
