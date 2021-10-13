import type { TimeRange } from './time-range';

export type Constraint = {
  definition: string;
  description: string;
  id: number;
  modelId: number | null;
  name: string;
  planId: number | null;
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

export type CreateConstraint = Omit<Constraint, 'id'>;

export interface MouseOverViolations {
  e: MouseEvent;
  violations: ConstraintViolation[];
}
