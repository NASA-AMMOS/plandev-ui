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

export type ConstraintViolation = {
  activityInstanceIds: number[];
  windows: TimeRange[];
};

export type ConstraintResult = {
  constraintId: Constraint['id'];
  constraintName: Constraint['name'];
  gaps: TimeRange[];
  resourceIds: string[];
  type: ConstraintType;
  violations: ConstraintViolation[];
};
