export interface ActivityTypeParameter {
  default: any;
  name: string;
  schema: ActivityTypeParameterSchema;
}

export interface ActivityTypeParameterSchema {
  items?: ActivityTypeParameterSchema;
  key?: ActivityTypeParameterSchema;
  type: ActivityTypeParameterSchemaType;
  value?: ActivityTypeParameterSchema;
  variants?: ActivityTypeParameterSchemaVariant[];
}

export type ActivityTypeParameterSchemaType =
  | 'boolean'
  | 'duration'
  | 'int'
  | 'real'
  | 'series'
  | 'string'
  | 'struct'
  | 'variant';

export interface ActivityTypeParameterSchemaVariant {
  key: string;
  label: string;
}

export interface ActivityType {
  name: string;
  parameters: ActivityTypeParameter[];
}
