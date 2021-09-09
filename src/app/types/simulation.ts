import { ActivityInstance } from './activity-instance';
import { ConstraintViolation } from './constraints';
import { Parameter, ParameterSchema } from './parameter';
import { StringTMap } from './string-t-map';

export interface DecompositionTreeState {
  instance: StringTMap<{ expanded: boolean }>;
}

export interface SimulationConfiguration {
  parameters: Parameter[];
}

export interface SimulationModelParameters {
  parameters: ParameterSchema[];
}

export interface SimulationResponse {
  activities: ActivityInstance[];
  message?: string;
  results?: SimulationResult[];
  status: 'complete' | 'failed' | 'incomplete';
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
