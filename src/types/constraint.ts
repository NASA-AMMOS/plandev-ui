import type { PartialWith } from './app';
import type { BaseDefinition, BaseMetadata } from './metadata';
import type { ConstraintTagsInsertInput } from './tags';
import type { TimeRange } from './timeline';

export type ConstraintDefinition = BaseDefinition & {
  constraint_id: number;
};

export type ConstraintMetadataVersionDefinition = Pick<
  ConstraintDefinition,
  'author' | 'definition' | 'revision' | 'tags'
>;

export type ConstraintMetadata = BaseMetadata<ConstraintDefinition>;

export type ConstraintMetadataSlim = Omit<ConstraintMetadata, 'models_using' | 'plans_using' | 'versions'>;

export type ConstraintModelSpec = {
  constraint_id: number;
  constraint_metadata: ConstraintMetadata | null;
  constraint_revision: number;
  model_id: number;
  // constraint_definition: ConstraintDefinition;
  // model: Model;
};

export type ConstraintPlanSpec = {
  constraint_id: number;
  constraint_metadata:
    | (Pick<ConstraintMetadata, 'name' | 'owner' | 'public'> & { versions: Pick<ConstraintDefinition, 'revision'>[] })
    | null;
  constraint_revision: number | null;
  enabled: boolean;
  plan_id: number;
  // constraint_definition: ConstraintDefinition;
  // plan: Plan;
};

export type ConstraintPlanSpecInsertInput = Omit<ConstraintPlanSpec, 'constraint_metadata'>;

export type ConstraintDefinitionInsertInput = Pick<ConstraintDefinition, 'constraint_id' | 'definition'> & {
  tags: {
    data: ConstraintTagsInsertInput[];
  };
};

export type ConstraintInsertInput = Omit<
  ConstraintMetadataSlim,
  'id' | 'created_at' | 'updated_at' | 'owner' | 'updated_by' | 'tags'
> & {
  tags: {
    data: ConstraintTagsInsertInput[];
  };
  versions: {
    data: Omit<ConstraintDefinitionInsertInput, 'constraint_id'>[];
  };
};

export type ConstraintMetadataSetInput = PartialWith<ConstraintMetadata, 'owner'>;

export type ConstraintType = 'model' | 'plan';

export type ConstraintViolation = {
  activityInstanceIds: number[];
  windows: TimeRange[];
};

export type ConstraintResult = {
  gaps: TimeRange[];
  resourceIds: string[];
  violations: ConstraintViolation[] | null;
};

export type ConstraintResultWithName = ConstraintResult & { constraintName: string };

export type ConstraintResponse = {
  constraintId: ConstraintMetadata['id'];
  constraintName: ConstraintMetadata['name'];
  errors: UserCodeError[];
  results: ConstraintResult;
  success: boolean;
  type: ConstraintType;
};

export type UserCodeError = {
  location: CodeLocation;
  message: string;
  stack: string;
};

export type CodeLocation = {
  column: number;
  line: number;
};
