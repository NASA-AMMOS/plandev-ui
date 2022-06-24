type ValueSchemaBoolean = {
  type: 'boolean';
};

type ValueSchemaDuration = {
  type: 'duration';
};

type ValueSchemaInt = {
  type: 'int';
};

type ValueSchemaPath = {
  type: 'path';
};

type ValueSchemaReal = {
  type: 'real';
};

type ValueSchemaSeries = {
  items: ValueSchema;
  type: 'series';
};

type ValueSchemaString = {
  type: 'string';
};

type ValueSchemaStruct = {
  items: Record<string, ValueSchema>;
  type: 'struct';
};

type ValueSchemaVariant = {
  type: 'variant';
  variants: Variant[];
};

type ValueSchema =
  | ValueSchemaBoolean
  | ValueSchemaDuration
  | ValueSchemaInt
  | ValueSchemaPath
  | ValueSchemaReal
  | ValueSchemaSeries
  | ValueSchemaString
  | ValueSchemaStruct
  | ValueSchemaVariant;

type Variant = {
  key: string;
  label: string;
};
