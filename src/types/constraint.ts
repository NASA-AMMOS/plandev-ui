import type { UserId } from './app';
import type { Tag } from './tags';
import type { TimeRange } from './timeline';

export type Constraint = {
  created_at: string;
  definition: string;
  description: string;
  id: number;
  model_id: number | null;
  name: string;
  owner: UserId;
  plan_id: number | null;
  tags: { tag: Tag }[];
  updated_at: string;
  updated_by: UserId;
};

export type ConstraintInsertInput = Omit<
  Constraint,
  'id' | 'created_at' | 'updated_at' | 'owner' | 'updated_by' | 'tags'
>;

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
