import type { ConstraintDefinitionType } from '../enums/constraint';
import type { PartialWith, UserId } from './app';
import type { BaseDefinition, BaseMetadata } from './metadata';
import type { ConstraintTagsInsertInput } from './tags';
import type { TimeRange } from './timeline';

export type ConstraintDefinition = BaseDefinition & {
  constraint_id: number;
  type: ConstraintDefinitionType;
  uploaded_jar_id: number | null;
};

export type ConstraintMetadataVersionDefinition = Pick<
  ConstraintDefinition,
  'author' | 'definition' | 'revision' | 'tags' | 'type' | 'uploaded_jar_id'
>;

export type ConstraintMetadata = BaseMetadata<ConstraintDefinition>;

export type ConstraintMetadataSlim = Omit<ConstraintMetadata, 'models_using' | 'plans_using' | 'versions'>;

export type ConstraintModelSpecification = {
  arguments: any;
  constraint_id: number;
  constraint_metadata: Pick<ConstraintMetadata, 'id' | 'name'> | null;
  constraint_revision: number | null;
  invocation_id: number;
  model_id: number;
  order: number;
  // constraint_definition: ConstraintDefinition;
  // model: Model;
};

export type ConstraintPlanSpecification = {
  arguments: any;
  constraint_id: number;
  constraint_metadata:
    | (Pick<ConstraintMetadata, 'name' | 'owner' | 'public'> & {
        versions: Pick<ConstraintDefinition, 'parameter_schema' | 'revision' | 'type'>[];
      })
    | null;
  constraint_revision: number | null;
  enabled: boolean;
  invocation_id: number;
  order: number;
  plan_id: number;
  // constraint_definition: ConstraintDefinition;
  // plan: Plan;
};

export type ConstraintModelSpecInsertInput = Omit<
  ConstraintModelSpecification,
  'constraint_metadata' | 'invocation_id'
>;
export type ConstraintModelSpecSetInput = Pick<
  ConstraintModelSpecification,
  'invocation_id' | 'arguments' | 'constraint_revision' | 'order'
>;
export type ConstraintPlanSpecSetInput = Omit<ConstraintPlanSpecification, 'constraint_metadata'>;
export type ConstraintPlanSpecInsertInput = Omit<ConstraintPlanSpecSetInput, 'constraint_metadata' | 'invocation_id'>;

export type ConstraintDefinitionInsertInput = Pick<
  ConstraintDefinition,
  'constraint_id' | 'definition' | 'type' | 'uploaded_jar_id'
> & {
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

export type ConstraintResultRun = {
  constraint_invocation_id: number;
  results: ConstraintRun[];
};

export type ConstraintRequest = {
  constraints_run: ConstraintResultRun[];
  force_rerun: boolean;
  id: number;
  plan_id: number;
  requested_at: string;
  requested_by: UserId;
  simulation_dataset_id: number;
};

export type CheckConstraintResponse = {
  constraintsRun: ConstraintResponse[];
  requestId: number;
};

export type ConstraintResponse = {
  constraintId: ConstraintMetadata['id'];
  constraintInvocationId: ConstraintRun['constraint_invocation_id'];
  constraintName: ConstraintMetadata['name'];
  errors: UserCodeError[];
  results: ConstraintResult;
  success: boolean;
  type: ConstraintType;
};

export type ConstraintRun = {
  arguments: any;
  constraint_id: number;
  constraint_invocation_id: number;
  constraint_revision: number;
  results: ConstraintResultWithName;
  simulation_data_id: number;
};

export type ConstraintInvocationMap<T> = Record<
  ConstraintPlanSpecification['constraint_id'],
  Record<ConstraintPlanSpecification['invocation_id'], T>
>;

export type UserCodeError = {
  location: CodeLocation;
  message: string;
  stack: string;
};

export type CodeLocation = {
  column: number;
  line: number;
};
