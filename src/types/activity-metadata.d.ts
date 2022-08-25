type ActivityMetadataValueBoolean = boolean;

type ActivityMetadataValueEnum = number | string;

type ActivityMetadataValueEnumMultiselect = (number | string)[];

type ActivityMetadataValueLongString = string;

type ActivityMetadataValueNumber = number;

type ActivityMetadataValueString = string;

type ActivityMetadataValue =
  | ActivityMetadataValueBoolean
  | ActivityMetadataValueEnum
  | ActivityMetadataValueEnumMultiselect
  | ActivityMetadataValueLongString
  | ActivityMetadataValueNumber
  | ActivityMetadataValueString;

type ActivityMetadataKey = string;

type ActivityMetadata = Record<ActivityMetadataKey, ActivityMetadataValue>;

type ActivityMetadataSchemaBoolean = {
  type: 'boolean';
};

type ActivityMetadataSchemaEnum = {
  enumerates: (number | string)[];
  type: 'enum';
};

type ActivityMetadataSchemaEnumMultiselect = {
  enumerates: (number | string)[];
  type: 'enum_multiselect';
};

type ActivityMetadataSchemaLongString = {
  type: 'long_string';
};

type ActivityMetadataSchemaNumber = {
  type: 'number';
};

type ActivityMetadataSchemaString = {
  type: 'string';
};

type ActivityMetadataSchema =
  | ActivityMetadataSchemaBoolean
  | ActivityMetadataSchemaEnum
  | ActivityMetadataSchemaEnumMultiselect
  | ActivityMetadataSchemaLongString
  | ActivityMetadataSchemaNumber
  | ActivityMetadataSchemaString;

type ActivityMetadataDefinition = {
  key: string;
  schema: ActivityMetadataSchema;
};
