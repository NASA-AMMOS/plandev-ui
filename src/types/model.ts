import type { UserId } from './app';
import type { ConstraintModelSpecification } from './constraint';
import type { ModelDerivationGroup } from './external-source';
import type { ParametersMap } from './parameter';
import type { SchedulingConditionModelSpecification, SchedulingGoalModelSpecification } from './scheduling';
import type { View, ViewSlim } from './view';

export type Model = ModelSchema;

export type ModelInsertInput = Pick<Model, 'description' | 'jar_id' | 'mission' | 'name' | 'version'>;
export type ModelSetInput = Pick<Model, 'default_view_id' | 'description' | 'mission' | 'name' | 'owner' | 'version'>;

export type ModelStatus = 'extracting' | 'complete' | 'error' | 'none';
export type ModelStatusRollup = {
  activityLog: ModelLog | null;
  activityLogStatus: ModelStatus;
  modelStatus: ModelStatus;
  parameterLog: ModelLog | null;
  parameterLogStatus: ModelStatus;
  resourceLog: ModelLog | null;
  resourceLogStatus: ModelStatus;
};

export type ModelLog = {
  created_at: string;
  // delivered: boolean;
  error: string | null;
  error_message: string | null;
  // error_type: string | null;
  pending: boolean;
  // status: string | null;
  success: boolean;
  // tries: number;
  // triggering_user: UserId;
};

export type ModelSchema = {
  activity_types: { name: string; parameters: ParametersMap }[];
  constraint_specification: ConstraintModelSpecification[];
  created_at: string;
  default_view_id: number | null;
  derivation_group_specification: ModelDerivationGroup[];
  description?: string;
  /** What this model's declaration says PlanDev may DO with it. See utilities/modelCapabilities. */
  external_capabilities?: Record<string, unknown> | null;
  id: number;
  /**
   * Null for a model PlanDev did not compile. A model declared by an imported run has no jar behind
   * it, so anything that reaches for the file has to ask first -- see effects.deleteModel.
   */
  jar_id: number | null;
  mission: string;
  /** How PlanDev came to know this model's types: `jar` (compiled) or `declared` (from a file). */
  model_type?: string | null;
  name: string;
  owner: UserId;
  parameters: { parameters: ParametersMap };
  plans: { id: number }[];
  refresh_activity_type_logs: ModelLog[]; // query returns the last entry as it is the most relevant
  refresh_model_parameter_logs: ModelLog[]; // query returns the last entry as it is the most relevant
  refresh_resource_type_logs: ModelLog[]; // query returns the last entry as it is the most relevant
  revision: number;
  scheduling_specification_conditions: SchedulingConditionModelSpecification[];
  scheduling_specification_goals: SchedulingGoalModelSpecification[];
  version: string;
  view: View | null;
};

export type ModelSlim = Pick<
  Model,
  | 'activity_types'
  | 'created_at'
  | 'description'
  | 'external_capabilities'
  | 'id'
  | 'jar_id'
  | 'model_type'
  | 'name'
  | 'owner'
  | 'plans'
  | 'refresh_activity_type_logs'
  | 'refresh_model_parameter_logs'
  | 'refresh_resource_type_logs'
  | 'version'
> & { view: ViewSlim | null };
