export function getArgument(
  value: Argument,
  schema: ValueSchema,
  defaultValue?: Argument,
): any {
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

export function getFormParameters(
  parametersMap: ParametersMap,
  argumentsMap: ArgumentsMap,
  defaultArgumentsMap: ArgumentsMap = {},
): FormParameter[] {
  const formParameters = Object.entries(parametersMap).map(
    ([name, { schema }]) => {
      const arg: Argument = argumentsMap[name];
      const defaultArg: Argument | undefined = defaultArgumentsMap[name];
      const value = getArgument(arg, schema, defaultArg);

      const formParameter: FormParameter = {
        error: null,
        name,
        schema,
        value,
      };

      return formParameter;
    },
  );

  return formParameters;
}

export function isNotEmpty(value: any): boolean {
  return (
    value !== null &&
    value !== undefined &&
    !Number.isNaN(value) &&
    value !== ''
  );
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
