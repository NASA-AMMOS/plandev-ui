import type { PartialWith } from './app';
import type { SchedulingError } from './errors';
import type { BaseDefinition, BaseMetadata } from './metadata';
import type { ArgumentsMap } from './parameter';
import type { ValueSchema } from './schema';
import type { SchedulingTagsInsertInput } from './tags';

type SchedulingDefinitionResponse<D> = Omit<D, 'tags'> & {
  tags: { tag_id: number }[];
};

export type SchedulingConditionDefinition = BaseDefinition & {
  condition_id: number;
};
export type SchedulingMetadataResponse<M, D> = Omit<M, 'plans_using' | 'tags' | 'versions'> & {
  plans_using?: {
    specification: {
      plan_id: number;
    };
  }[];
  tags: { tag_id: number }[];
  versions: SchedulingDefinitionResponse<D>[];
};

export type SchedulingConditionMetadata = BaseMetadata<SchedulingConditionDefinition>;
export type SchedulingConditionMetadataResponse = SchedulingMetadataResponse<
  SchedulingConditionMetadata,
  SchedulingConditionDefinition
>;

export type SchedulingConditionMetadataVersionDefinition = Pick<
  SchedulingConditionDefinition,
  'author' | 'definition' | 'revision' | 'tags'
>;

export type SchedulingGoalDefinition = BaseDefinition & {
  analyses?: SchedulingGoalAnalysis[];
  goal_id: number;
  parameter_schema?: ValueSchema;
  type: 'JAR' | 'EDSL';
};
export type SchedulingGoalMetadata = BaseMetadata<SchedulingGoalDefinition> & {
  analyses?: SchedulingGoalAnalysis[];
};

export type SchedulingGoalMetadataResponse = SchedulingMetadataResponse<
  SchedulingGoalMetadata,
  SchedulingGoalDefinition
>;

export type SchedulingConditionMetadataSlim = Omit<
  SchedulingConditionMetadata,
  'models_using' | 'plans_using' | 'versions'
>;
export type SchedulingGoalMetadataSlim = Omit<SchedulingGoalMetadata, 'models_using' | 'plans_using' | 'versions'>;

export type SchedulingGoalMetadataVersionDefinition = Pick<
  SchedulingGoalDefinition,
  'author' | 'definition' | 'revision' | 'tags'
>;

export type SchedulingConditionDefinitionInsertInput = Pick<
  SchedulingConditionDefinition,
  'condition_id' | 'definition'
> & {
  tags: {
    data: SchedulingTagsInsertInput[];
  };
};

export type SchedulingGoalDefinitionInsertInput = Pick<SchedulingGoalDefinition, 'goal_id' | 'definition'> & {
  tags: {
    data: SchedulingTagsInsertInput[];
  };
};

export type SchedulingConditionInsertInput = Omit<
  SchedulingConditionMetadataSlim,
  'id' | 'created_at' | 'updated_at' | 'owner' | 'updated_by' | 'tags'
> & {
  tags: {
    data: SchedulingTagsInsertInput[];
  };
  versions: {
    data: Omit<SchedulingConditionDefinitionInsertInput, 'condition_id'>[];
  };
};

export type SchedulingGoalInsertInput = Omit<
  SchedulingGoalMetadataSlim,
  'id' | 'created_at' | 'updated_at' | 'owner' | 'updated_by' | 'tags'
> & {
  tags: {
    data: SchedulingTagsInsertInput[];
  };
  versions: {
    data: Omit<SchedulingGoalDefinitionInsertInput, 'goal_id'>[];
  };
};

export type SchedulingConditionPlanSpecInsertInput = Omit<SchedulingConditionPlanSpecification, 'condition_metadata'>;
export type SchedulingGoalPlanSpecSetInput = Omit<SchedulingGoalPlanSpecification, 'goal_metadata'>;
export type SchedulingGoalPlanSpecInsertInput = Omit<SchedulingGoalPlanSpecSetInput, 'goal_invocation_id'>;

export type SchedulingConditionMetadataSetInput = PartialWith<SchedulingConditionMetadata, 'owner'>;
export type SchedulingGoalMetadataSetInput = PartialWith<SchedulingGoalMetadata, 'owner'>;

export type SchedulingGoalAnalysis = {
  analysis_id: number;
  goal_definition: SchedulingGoalDefinition;
  goal_id: number;
  goal_revision: number;
  request: { specification_id: number };
  satisfied: boolean;
  satisfying_activities: { activity_id: number }[];
};

export type SchedulingResponse = {
  analysisId: number | null;
  reason: SchedulingError;
};

export type SchedulingGoalModelSpecification = {
  goal_id: number;
  goal_metadata: Pick<SchedulingGoalMetadata, 'id' | 'name'> | null;
  goal_revision: number | null;
  model_id: number;
  priority: number;
  // goal_definition: SchedulingGoalDefinition;
};

export type SchedulingConditionModelSpecification = {
  condition_id: number;
  condition_metadata: Pick<SchedulingConditionMetadata, 'id' | 'name'> | null;
  condition_revision: number | null;
  model_id: number;
  // condition_definition: SchedulingConditionDefinition;
};

export type SchedulingPlanSpecification = {
  analysis_only: boolean;
  conditions?: SchedulingConditionPlanSpecification[];
  goals?: SchedulingGoalPlanSpecification[];
  horizon_end: string;
  horizon_start: string;
  id: number;
  plan_id: number;
  plan_revision: number;
  revision: number;
  simulation_arguments: ArgumentsMap;
};

export type SchedulingConditionModelSpecificationInsertInput = Omit<
  SchedulingConditionModelSpecification,
  'condition_metadata'
>;
export type SchedulingGoalModelSpecificationInsertInput = Omit<SchedulingGoalModelSpecification, 'goal_metadata'>;
export type SchedulingPlanSpecificationInsertInput = Omit<SchedulingPlanSpecification, 'id' | 'revision'>;

export type SchedulingGoalModelSpecificationSetInput = Pick<
  SchedulingGoalModelSpecification,
  'goal_id' | 'goal_revision' | 'priority'
>;
export type SchedulingConditionPlanSpecification = {
  // condition_definition: SchedulingConditionDefinition;
  condition_id: number;
  condition_metadata:
    | (Pick<SchedulingConditionMetadata, 'name' | 'owner' | 'public'> & {
        versions: Pick<SchedulingConditionDefinition, 'revision'>;
      })
    | null;
  condition_revision: number | null;
  enabled: boolean;
  specification_id: number;
};

export type SchedulingGoalPlanSpecification = {
  arguments: any;
  enabled: boolean;
  goal_definition?: Pick<SchedulingGoalDefinition, 'analyses'> | null;
  goal_id: number;
  goal_invocation_id?: number;
  goal_metadata:
    | (Pick<SchedulingGoalMetadata, 'name' | 'owner' | 'public'> & {
        versions: Pick<SchedulingGoalDefinition, 'revision' | 'analyses' | 'type' | 'parameter_schema'>[];
      })
    | null;
  goal_revision: number | null;
  priority: number;
  simulate_after: boolean;
  specification_id: number;
};

export type SchedulingRequest = {
  analysis_id: number;
  canceled: boolean;
  dataset_id: number | null;
  reason: SchedulingError | null;
  requested_at: string;
  requested_by: string;
  specification_id: number;
  specification_revision: number;
  status: 'success' | 'failed' | 'incomplete' | 'pending';
};
