import type { Activity } from './activity';
import type { ConstraintViolation } from './constraint';

export type SimulationResponse = {
  activities?: Activity[];
  message?: string;
  results?: Resource[];
  status: 'complete' | 'failed' | 'incomplete';
  success: boolean;
  violations?: ConstraintViolation[];
};

export enum SimulationStatus {
  Clean = 'Clean',
  Complete = 'Complete',
  Dirty = 'Dirty',
  Executing = 'Executing',
  Failed = 'Failed',
  Incomplete = 'Incomplete',
  Unknown = 'Unknown',
}

export type Resource = {
  name: string;
  schema: any;
  start: string;
  values: ResourceValue[];
};

export type ResourceValue = {
  x: number;
  y: number | string;
};
