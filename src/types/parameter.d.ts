type EffectiveArguments = {
  arguments: ArgumentsMap;
  errors: ParametersErrorMap;
  success: boolean;
};

type FormParameter<T = ValueSchema> = {
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

type Argument = any;

type ArgumentsMap = Record<ParameterName, Argument>;

type Parameter = { order: number; schema: ValueSchema };

type ParameterError = { message: string; schema: ValueSchema };

type ParametersErrorMap = Record<ParameterName, ParameterError>;

type ParameterName = string;

type RequiredParametersList = ParameterName[];

type ParametersMap = Record<ParameterName, Parameter>;

type ParameterValidationError = {
  message: string;
  subjects: string[];
};

type ParameterValidationResponse = {
  errors?: ParameterValidationError[];
  success: boolean;
};

type ValueSource = 'user' | 'mission' | 'none';
