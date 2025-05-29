import type { ValueSchema } from './schema';
import type {
  ActionValueSchemaBoolean,
  ActionValueSchemaDuration,
  ActionValueSchemaInt,
  ActionValueSchemaPath,
  ActionValueSchemaReal,
  ActionValueSchemaSequence,
  ActionValueSchemaSequenceList,
  ActionValueSchemaSeries,
  ActionValueSchemaString,
  ActionValueSchemaStruct,
  ActionValueSchemaVariant,
} from '@nasa-jpl/aerie-actions/src/types/schema';

export type ActionValueSchemaWithOptions = {
  options: ActionValueSchemaOption[];
};
export type ActionValueSchemaOption = {
  display: string;
  value: string;
};

export type ActionValueSchemaSequenceWithOptions = ActionValueSchemaSequence & ActionValueSchemaWithOptions;
export type ActionValueSchemaSequenceListWithOptions = ActionValueSchemaSequenceList & ActionValueSchemaWithOptions;

export type UIActionValueSchema =
  | ActionValueSchemaBoolean
  | ActionValueSchemaDuration
  | ActionValueSchemaInt
  | ActionValueSchemaPath
  | ActionValueSchemaReal
  | ActionValueSchemaSequenceWithOptions
  | ActionValueSchemaSequenceListWithOptions
  | ActionValueSchemaSeries
  | ActionValueSchemaString
  | ActionValueSchemaStruct
  | ActionValueSchemaVariant;

export type DefaultEffectiveArguments = {
  arguments: ArgumentsMap;
  typeName: string;
};

export type DefaultEffectiveArgumentsMap = Record<string, ArgumentsMap>;

export type EffectiveArguments = {
  arguments: ArgumentsMap;
  errors: ParametersErrorMap;
  success: boolean;
};

export type FormParameter<T = ValueSchema | UIActionValueSchema> = {
  errors: string[] | null;
  file?: File;
  index?: number;
  key?: string;
  name: string;
  order: number;
  required?: boolean;
  schema: T;
  value: Argument;
  valueSource: ValueSource;
};

export type Argument = any;

export type ArgumentsMap = Record<ParameterName, Argument>;

export type Parameter = { order: number; schema: ValueSchema; unit?: string };
export type ActionParameter = { order: number; schema: UIActionValueSchema; unit?: string };
export type ComputedParameter = { order: number; schema: ValueSchema; units?: Record<ParameterName, string> };

export type ParameterError = { message: string; schema: ValueSchema };

export type ParametersErrorMap = Record<ParameterName, ParameterError>;

export type ParameterName = string;

export type RequiredParametersList = ParameterName[];

export type BaseParameter = Parameter | ActionParameter;
export type ParametersMap<T extends BaseParameter = BaseParameter> = Record<ParameterName, T>;
export type ComputedParametersMap = Record<ParameterName, ComputedParameter>;

export type ParameterValidationError = {
  message: string;
  subjects: string[];
};

export type ParameterValidationResponse = {
  errors?: ParameterValidationError[];
  success: boolean;
};

export type ParameterType = 'action' | 'activity' | 'simulation';
export type ValueSource = 'user on model' | 'user on preset' | 'preset' | 'mission' | 'none';
