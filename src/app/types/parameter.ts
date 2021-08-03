export type Parameter = {
  name: string;
  value: any;
};

export interface ParameterSchema {
  default: any;
  name: string;
  schema: any;
}

export type FormParameter = {
  error: string | null;
  file?: File;
  index?: number;
  key?: string;
  loading: boolean;
  name: string;
  schema: any;
  value: any;
};

export type FormParameterChange = {
  file?: File;
  newValue: any;
  parameter: FormParameter;
  shouldValidate: boolean;
};
