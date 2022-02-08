type Field<T> = {
  dirty: boolean;
  dirtyAndValid: boolean;
  errors: string[];
  firstError: string;
  initialValue: T;
  invalid: boolean;
  pending: boolean;
  valid: boolean;
  validators: ValidatorFn<T>[];
  value: T;
};

type FieldStore<T> = import('svelte/store').Writable<Field<T>> & {
  validate(value?: T): Promise<boolean>;
};

type ValidatorFn<T> = (value: T) => Promise<ValidationResult>;

type ValidationResult = string | null;
