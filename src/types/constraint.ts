import type { TimeRange } from './timeline';

export type Constraint = {
  definition: string;
  description: string;
  id: number;
  model_id: number | null;
  name: string;
  plan_id: number | null;
};

export type ConstraintInsertInput = Omit<Constraint, 'id'>;

export type ConstraintType = 'model' | 'plan';

export type ConstraintViolationAssociations = {
  activityInstanceIds: number[];
  resourceIds: string[];
};

export type ConstraintViolation = {
  associations: ConstraintViolationAssociations;
  constraintId: Constraint['id'];
  constraintName: Constraint['name'];
  gaps: TimeRange[];
  type: ConstraintType;
  windows: TimeRange[];
};

export type ConstraintViolationsMap = Record<Constraint['id'], ConstraintViolation[]>;

export type ConstraintVisibilityMap = Record<Constraint['id'], boolean>;
