type FormParameter<T = ValueSchema> = {
  error: string | null;
  file?: File;
  index?: number;
  key?: string;
  name: string;
  schema: T;
  value: Argument;
};

type Argument = any;

type ArgumentsMap = Record<ParameterName, Argument>;

type Parameter = { order: number; schema: ValueSchema };

type ParameterName = string;

type ParametersMap = Record<ParameterName, Parameter>;

type ParameterValidationResponse = {
  errors: string[] | null;
  success: boolean;
};
