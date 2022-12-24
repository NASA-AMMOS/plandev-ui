export type ActivityMetadataValueBoolean = boolean;

export type ActivityMetadataValueEnum = number | string;

export type ActivityMetadataValueEnumMultiselect = (number | string)[];

export type ActivityMetadataValueLongString = string;

export type ActivityMetadataValueNumber = number;

export type ActivityMetadataValueString = string;

export type ActivityMetadataValue =
  | ActivityMetadataValueBoolean
  | ActivityMetadataValueEnum
  | ActivityMetadataValueEnumMultiselect
  | ActivityMetadataValueLongString
  | ActivityMetadataValueNumber
  | ActivityMetadataValueString;

export type ActivityMetadataKey = string;

export type ActivityMetadata = Record<ActivityMetadataKey, ActivityMetadataValue>;

export type ActivityMetadataSchemaBoolean = {
  type: 'boolean';
};

export type ActivityMetadataSchemaEnum = {
  enumerates: (number | string)[];
  type: 'enum';
};

export type ActivityMetadataSchemaEnumMultiselect = {
  enumerates: (number | string)[];
  type: 'enum_multiselect';
};

export type ActivityMetadataSchemaLongString = {
  type: 'long_string';
};

export type ActivityMetadataSchemaNumber = {
  type: 'number';
};

export type ActivityMetadataSchemaString = {
  type: 'string';
};

export type ActivityMetadataSchema =
  | ActivityMetadataSchemaBoolean
  | ActivityMetadataSchemaEnum
  | ActivityMetadataSchemaEnumMultiselect
  | ActivityMetadataSchemaLongString
  | ActivityMetadataSchemaNumber
  | ActivityMetadataSchemaString;

export type ActivityMetadataDefinition = {
  key: string;
  schema: ActivityMetadataSchema;
};
