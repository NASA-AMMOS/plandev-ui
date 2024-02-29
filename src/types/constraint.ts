import type { PartialWith, UserId } from './app';
import type { Model } from './model';
import type { Plan } from './plan';
import type { ConstraintTagsInsertInput, Tag } from './tags';
import type { TimeRange } from './timeline';

export type ConstraintDefinition = {
  author: UserId;
  constraint_id: number;
  created_at: string;
  definition: string;
  metadata: ConstraintMetadata;
  // models_using: Model[];
  // plans_using: Plan[];
  revision: number;
  tags: { tag: Tag }[];
};

export type ConstraintMetadataVersionDefinition = Pick<
  ConstraintDefinition,
  'author' | 'definition' | 'revision' | 'tags'
>;

export type ConstraintMetadata = {
  created_at: string;
  description?: string;
  id: number;
  models_using: Pick<Model, 'id'>[];
  name: string;
  owner: UserId;
  plans_using: Pick<Plan, 'id'>[];
  public: boolean;
  tags: { tag: Tag }[];
  updated_at: string;
  updated_by: UserId;
  versions: ConstraintMetadataVersionDefinition[];
};

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
  constraint_metadata: Pick<ConstraintMetadata, 'name' | 'owner' | 'public' | 'versions'> | null;
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
