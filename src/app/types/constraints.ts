import { TimeRange } from './time-range';

export interface Constraint {
  definition: string;
  name: string;
}

export interface ConstraintViolation {
  associations: ConstraintViolationAssociations;
  constraint: Constraint;
  windows: TimeRange[];
}

export interface ConstraintViolationAssociations {
  activityInstanceIds?: string[];
  resourceIds?: string[];
}

export interface UpdateConstraintsResponse {
  message: string;
  success: boolean;
}
