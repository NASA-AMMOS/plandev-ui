import { ActivityInstance } from './activity-instance';
import { StringTMap } from './string-t-map';
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

export interface DecompositionTreeState {
  instance: StringTMap<{ expanded: boolean }>;
}

export interface SimulationResponse {
  activities: ActivityInstance[];
  message?: string;
  results?: SimulationResult[];
  success: boolean;
  violations?: Violation[];
}

export interface SimulationResult {
  name: string;
  schema: any;
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

export interface ViolationListState {
  category: StringTMap<{ expanded: boolean; visible: boolean }>;
  constraint: StringTMap<{ expanded: boolean; visible: boolean }>;
}
