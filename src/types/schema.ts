export type ValueSchemaBoolean = {
  type: 'boolean';
};

export type ValueSchemaDuration = {
  type: 'duration';
};

export type ValueSchemaInt = {
  type: 'int';
};

export type ValueSchemaPath = {
  type: 'path';
};

export type ValueSchemaReal = {
  type: 'real';
};

export type ValueSchemaSeries = {
  items: ValueSchema;
  type: 'series';
};

export type ValueSchemaString = {
  type: 'string';
};

export type ValueSchemaStruct = {
  items: Record<string, ValueSchema>;
  type: 'struct';
};

export type ValueSchemaVariant = {
  type: 'variant';
  variants: Variant[];
};

export type ValueSchema =
  | ValueSchemaBoolean
  | ValueSchemaDuration
  | ValueSchemaInt
  | ValueSchemaPath
  | ValueSchemaReal
  | ValueSchemaSeries
  | ValueSchemaString
  | ValueSchemaStruct
  | ValueSchemaVariant;

export type Variant = {
  key: string;
  label: string;
};
