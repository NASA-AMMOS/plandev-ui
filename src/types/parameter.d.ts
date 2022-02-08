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

type ArgumentsMap = Record<ParameterName, Argument>;

type ParameterSchemaBoolean = {
  type: 'boolean';
};

type ParameterSchemaDuration = {
  type: 'duration';
};

type ParameterSchemaInt = {
  type: 'int';
};

type ParameterSchemaPath = {
  type: 'path';
};

type ParameterSchemaReal = {
  type: 'real';
};

type ParameterSchemaSeries = {
  type: 'series';
  items: ParameterSchema;
};

type ParameterSchemaString = {
  type: 'string';
};

type ParameterSchemaStruct = {
  items: Record<string, ParameterSchema>;
  type: 'struct';
};

type ParameterSchemaVariant = {
  variants: { key: string; label: string }[];
  type: 'variant';
};

type ParameterSchema =
  | ParameterSchemaBoolean
  | ParameterSchemaDuration
  | ParameterSchemaInt
  | ParameterSchemaPath
  | ParameterSchemaReal
  | ParameterSchemaSeries
  | ParameterSchemaString
  | ParameterSchemaStruct
  | ParameterSchemaVariant;

type Parameter = { order: number; schema: ParameterSchema };

type ParameterName = string;

type ParametersMap = Record<ParameterName, Parameter>;

type ParameterValidationResponse = {
  errors: string[] | null;
  success: boolean;
};
