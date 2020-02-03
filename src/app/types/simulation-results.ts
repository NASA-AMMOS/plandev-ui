import { StringTMap } from './string-t-map';

export interface SimulationResults {
  resources: StringTMap<number[]>;
  times: string[];
}
