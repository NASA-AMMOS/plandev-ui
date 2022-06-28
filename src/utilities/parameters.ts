import { omitBy } from 'lodash-es';
import { isEmpty } from './generic';

export function getArgument(value: Argument, schema: ValueSchema, defaultValue?: Argument): any {
  const type = schema.type;

  if (value !== null && value !== undefined) {
    return value;
  } else if (defaultValue !== undefined) {
    return defaultValue;
  } else if (type === 'series') {
    return [];
  } else if (type === 'struct') {
    const struct = Object.entries(schema.items).reduce(
      (struct, [key, subSchema]) => ({
        ...struct,
        [key]: getArgument(null, subSchema),
      }),
      {},
    );
    return struct;
  } else {
    return null;
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
  defaultArgumentsMap: ArgumentsMap = {},
): FormParameter[] {
  const formParameters = Object.entries(parametersMap).map(([name, { order, schema }]) => {
    const arg: Argument = argumentsMap[name];
    const defaultArg: Argument | undefined = defaultArgumentsMap[name];
    const value = getArgument(arg, schema, defaultArg);

    const formParameter: FormParameter = {
      error: null,
      name,
      order,
      schema,
      value,
    };

    return formParameter;
  });

  return formParameters;
}
