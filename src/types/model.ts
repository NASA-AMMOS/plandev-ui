import type { UserId } from './app';
import type { ConstraintModelSpecification } from './constraint';
import type { ModelDerivationGroup } from './external-source';
import type { ParametersMap } from './parameter';
import type { SchedulingConditionModelSpecification, SchedulingGoalModelSpecification } from './scheduling';
import type { View, ViewSlim } from './view';

export type Model = ModelSchema;

export type ModelInsertInput = Pick<Model, 'description' | 'jar_id' | 'mission' | 'name' | 'version'>;
export type ModelSetInput = Pick<Model, 'default_view_id' | 'description' | 'mission' | 'name' | 'owner' | 'version'>;

/**
 * Insert input for a mission model served by an external / foreign backend
 * (i.e. not an uploaded Java JAR). These map to columns on `merlin.mission_model`.
 */
export type ExternalModelInsertInput = {
  external_backend: string;
  external_model_key: string;
  mission: string;
  model_type: 'external';
  name: string;
  version: string;
};

/**
 * A single mission model discovered on an external backend, as returned by the
 * `getExternalModelCatalog` Hasura action.
 */
export type DiscoveredExternalModel = {
  identityHash: string;
  key: string;
  name: string;
  version: string;
};

/**
 * One operator-configured external backend together with the models it hosts,
 * as returned by the `getExternalModelCatalog` Hasura action.
 */
export type ExternalBackendCatalog = {
  backend: string;
  error: string | null;
  models: DiscoveredExternalModel[];
  reachable: boolean;
};

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
  external_backend?: string | null;
  /** What the backend says PlanDev may DO with this model. See utilities/modelCapabilities. */
  external_capabilities?: Record<string, unknown> | null;
  external_model_key?: string | null;
  id: number;
  jar_id: number | null;
  mission: string;
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
