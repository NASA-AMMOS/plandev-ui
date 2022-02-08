type FormParameter = {
  error: string | null;
  file?: File;
  index?: number;
  key?: string;
  loading: boolean;
  name: string;
  schema: any;
  value: Argument;
};

type Argument = any;
type ArgumentsMap = { [name: string]: Argument };

type ParameterSchema = { type: string } & any;
type Parameter = { order: number; schema: ParameterSchema };
type ParametersMap = { [name: string]: Parameter };

type ParameterValidationResponse = {
  errors: string[] | null;
  success: boolean;
};
