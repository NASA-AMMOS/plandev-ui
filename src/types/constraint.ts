import type { TimeRange } from './time-range';

export type Constraint = {
  definition: string;
  description: string;
  name: string;
  summary: string;
};

export type ConstraintViolationAssociations = {
  activityIds?: string[];
  resourceIds?: string[];
};

export type ConstraintViolation = {
  associations: ConstraintViolationAssociations;
  constraint: Constraint;
  windows: TimeRange[];
};

export interface MouseOverViolations {
  e: MouseEvent;
  violations: ConstraintViolation[];
}
