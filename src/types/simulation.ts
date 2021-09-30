import type { Activity } from './activity';
import type { ConstraintViolation } from './constraint';

export interface SimulationResponse {
  activities?: Activity[];
  message?: string;
  results?: Resource[];
  status: 'complete' | 'failed' | 'incomplete';
  success: boolean;
  violations?: ConstraintViolation[];
}

export interface Resource {
  name: string;
  schema: any;
  start: string;
  values: ResourceValue[];
}

export interface ResourceValue {
  x: number;
  y: number | string;
}
