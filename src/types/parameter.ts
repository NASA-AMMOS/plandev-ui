export type FormParameter = {
  error: string | null;
  file?: File;
  index?: number;
  key?: string;
  loading: boolean;
  name: string;
  schema: any;
  value: Argument;
};

export type Argument = any;
export type ArgumentsMap = { [name: string]: Argument };

export type ParameterSchema = { type: string } & any;
export type Parameter = { order: number; schema: ParameterSchema };
export type ParametersMap = { [name: string]: Parameter };

export type ParameterValidationResponse = {
  errors: string[] | null;
  success: boolean;
};
