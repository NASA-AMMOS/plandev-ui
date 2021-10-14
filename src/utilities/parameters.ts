import type { ArgumentsMap, FormParameter, ParametersMap } from '../types';

export function getFormParameters(
  parametersMap: ParametersMap,
  argumentsMap: ArgumentsMap,
): FormParameter[] {
  const formParameters = Object.entries(parametersMap).map(([name, schema]) => {
    const argValue = argumentsMap[name];
    let value = null;

    if (argValue) {
      value = argValue;
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

export function updateFormParameter(
  formParameters: FormParameter[],
  newFormParameter: FormParameter,
  update?: Partial<FormParameter>,
): FormParameter[] {
  return formParameters.map(formParameter => {
    if (formParameter.name === newFormParameter.name) {
      return { ...newFormParameter, ...update };
    }
    return formParameter;
  });
}
