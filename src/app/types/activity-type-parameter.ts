import { StringTMap } from './string-t-map';

export interface CActivityTypeParameter {
  default: any;
  name: string;
  type: string;
}
export type CActivityTypeParameterMap = StringTMap<CActivityTypeParameter>;

export interface SActivityTypeParameter {
  type: string;
}
export type SActivityTypeParameterMap = StringTMap<SActivityTypeParameter>;
