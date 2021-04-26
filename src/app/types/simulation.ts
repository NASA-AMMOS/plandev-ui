import { ActivityInstance } from './activity-instance';
import { ConstraintViolation } from './constraints';
import { StringTMap } from './string-t-map';

export interface DecompositionTreeState {
  instance: StringTMap<{ expanded: boolean }>;
}

export interface SimulationResponse {
  activities: ActivityInstance[];
  message?: string;
  results?: SimulationResult[];
  success: boolean;
  violations?: ConstraintViolation[];
}

export interface SimulationResult {
  name: string;
  schema: any;
  start: string;
  values: SimulationResultValue[];
}

export interface SimulationResultValue {
  x: number;
  y: number | string;
}
