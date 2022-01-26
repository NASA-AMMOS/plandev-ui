import type { Writable } from 'svelte/store';

export type Field<T> = {
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

export type FieldStore<T> = Writable<Field<T>> & {
  validate(value?: T): Promise<boolean>;
};

export type ValidatorFn<T> = (value: T) => Promise<ValidationResult>;

export type ValidationResult = string | null;
