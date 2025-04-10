import type { FilterOperator } from '../enums/filter';
import type { ValueSchema } from './schema';

export type DynamicFilterDataType = ValueSchema['type'] | 'tag';

export type DynamicFilter<T> = {
  field: keyof T;
  id: number;
  operator: keyof typeof FilterOperator;
  subfield?: { name: string; type: DynamicFilterDataType };
  value: string | string[] | number | number[] | boolean;
};
