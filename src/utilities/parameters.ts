import type {
  Argument,
  ArgumentsMap,
  FormParameter,
  ParametersMap,
} from '../types';

export function getArgument(value: Argument, type: string): any {
  if (value !== null && value !== undefined) {
    return value;
  } else if (type === 'boolean') {
    return false;
  } else if (type === 'duration') {
    return 0;
  } else if (type === 'int') {
    return 0;
  } else if (type === 'path') {
    return '/etc/os-release';
  } else if (type === 'real') {
    return 0;
  } else if (type === 'series') {
    return [];
  } else if (type === 'string') {
    return '';
  } else if (type === 'struct') {
    return {};
  } else if (type === 'variant') {
    return '';
  } else {
    return null;
  }
}

export function getFormParameters(
  parametersMap: ParametersMap,
  argumentsMap: ArgumentsMap,
): FormParameter[] {
  const formParameters = Object.entries(parametersMap).map(
    ([name, { schema }]) => {
      const arg: Argument = argumentsMap[name];
      const value = getArgument(arg, schema.type);

      const formParameter: FormParameter = {
        error: null,
        loading: false,
        name,
        schema,
        value,
      };

      return formParameter;
    },
  );

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
