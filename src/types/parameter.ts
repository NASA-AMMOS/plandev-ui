import type { StringTMap } from '.';

export type FormParameter = {
  error: string | null;
  file?: File;
  index?: number;
  key?: string;
  loading: boolean;
  name: string;
  schema: any;
  validate: boolean;
  value: any;
};

export type Parameter = {
  name: string;
  value: any;
};

export type ParameterMap = StringTMap<Parameter>;

export type ParameterSchema = {
  default: any;
  name: string;
  schema: any;
};

export type ParameterSchemaMap = StringTMap<ParameterSchema>;

export type ParameterValidationResponse = {
  errors: string[] | null;
  success: boolean;
};
