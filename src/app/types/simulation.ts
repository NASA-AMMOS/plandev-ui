import { TimeRange } from './time-range';

export interface Associations {
  activityInstanceIds?: string[];
  stateIds?: string[];
}

export interface Constraint {
  category: string;
  message: string;
  name: string;
}

export interface SimulationResponse {
  message?: string;
  results?: SimulationResult[];
  success: boolean;
  violations?: Violation[];
}

export interface SimulationResult {
  name: string;
  start: string;
  values: SimulationResultValue[];
}

export interface SimulationResultValue {
  x: number;
  y: number;
}

export interface Violation {
  associations: Associations;
  constraint: Constraint;
  windows: TimeRange[];
}
