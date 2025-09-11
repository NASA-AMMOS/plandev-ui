import type { UserId } from './app';
import type { ConstraintModelSpecification } from './constraint';
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
  // created_at: string;
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
  constraint_specification: ConstraintModelSpecification[];
  created_at: string;
  default_view_id: number | null;
  description?: string;
  id: number;
  jar_id: number;
  mission: string;
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
  | 'created_at'
  | 'description'
  | 'id'
  | 'jar_id'
  | 'name'
  | 'owner'
  | 'plans'
  | 'refresh_activity_type_logs'
  | 'refresh_model_parameter_logs'
  | 'refresh_resource_type_logs'
  | 'version'
> & { view: ViewSlim | null };
