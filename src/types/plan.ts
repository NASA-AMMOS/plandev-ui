import type { PlanImportStatus } from '../enums/planStatusMessages';
import type { ActivityDirective, ActivityDirectiveDB } from './activity';
import type { UserId } from './app';
import type { ConsoleEntry } from './console';
import type { ConstraintPlanSpecification } from './constraint';
import type { Model } from './model';
import type { ArgumentsMap, ParametersMap } from './parameter';
import type { SchedulingPlanSpecification } from './scheduling';
import type { Tag } from './tags';

export type Plan = PlanSchema & { end_time_doy: string; start_time_doy: string };

export type PlanBranchRequestAction = 'merge' | 'pull';

export type PlanCollaborator = { collaborator: UserId; plan_id: number };

export type PlanCollaboratorSlim = Pick<PlanCollaborator, 'collaborator'>;

export type PlanInsertInput = Pick<PlanSchema, 'duration' | 'model_id' | 'name' | 'start_time'>;

export type PlanMergeActivityOutcome = 'add' | 'delete' | 'modify' | 'none';

// DB types (what GraphQL returns, without start_time_ms)
export type PlanMergeActivityDirectiveDB = ActivityDirectiveDB & { snapshot_id: number };
export type PlanMergeActivityDirectiveSourceDB = Omit<PlanMergeActivityDirectiveDB, 'plan_id'>;
export type PlanMergeActivityDirectiveTargetDB = PlanMergeActivityDirectiveDB;

export type PlanMergeConflictingActivityDB = {
  activity_id: number;
  change_type_source: PlanMergeActivityOutcome;
  change_type_target: PlanMergeActivityOutcome;
  merge_base: PlanMergeActivityDirectiveDB;
  resolution: PlanMergeResolution;
  source: PlanMergeActivityDirectiveSourceDB | null;
  source_tags: Tag[];
  target: PlanMergeActivityDirectiveTargetDB | null;
  target_tags: Tag[];
};

export type PlanMergeNonConflictingActivityDB = {
  activity_id: number;
  change_type: PlanMergeActivityOutcome;
  source: PlanMergeActivityDirectiveSourceDB | null;
  source_tags: Tag[];
  target: PlanMergeActivityDirectiveTargetDB | null;
  target_tags: Tag[];
};

// Computed types (with start_time_ms)
export type PlanMergeActivityDirective = PlanMergeActivityDirectiveDB & { start_time_ms: number };
export type PlanMergeActivityDirectiveTarget = PlanMergeActivityDirective;
export type PlanMergeActivityDirectiveSource = Omit<PlanMergeActivityDirective, 'plan_id'>;

export type PlanMergeConflictingActivity = {
  activity_id: number;
  change_type_source: PlanMergeActivityOutcome;
  change_type_target: PlanMergeActivityOutcome;
  merge_base: PlanMergeActivityDirective;
  resolution: PlanMergeResolution;
  source: PlanMergeActivityDirectiveSource | null;
  source_tags: Tag[];
  target: PlanMergeActivityDirectiveTarget | null;
  target_tags: Tag[];
};

export type PlanMergeNonConflictingActivity = {
  activity_id: number;
  change_type: PlanMergeActivityOutcome;
  source: PlanMergeActivityDirectiveSource | null;
  source_tags: Tag[];
  target: PlanMergeActivityDirectiveTarget | null;
  target_tags: Tag[];
};

export type PlanMergeRequestType = 'incoming' | 'outgoing';

export type PlanMergeRequestTypeFilter = PlanMergeRequestType | 'all';

export type PlanMergeRequest = PlanMergeRequestSchema & { pending: boolean; type: PlanMergeRequestType };

export type PlanMergeRequestStatus = 'accepted' | 'in-progress' | 'pending' | 'rejected' | 'withdrawn';

export type PlanForMerging = Pick<
  PlanSchema,
  'id' | 'name' | 'owner' | 'collaborators' | 'model_id' | 'start_time' | 'duration'
> & {
  model: Pick<Model, 'id' | 'name' | 'owner' | 'version'>;
};

export type PlanMergeRequestSchema = {
  id: number;
  plan_receiving_changes?: PlanForMerging;
  plan_snapshot_supplying_changes: {
    plan?: PlanForMerging;
    snapshot_id: number;
  };
  requester_username: string;
  reviewer_username: string;
  status: PlanMergeRequestStatus;
};

export type PlanMergeResolution = 'none' | 'source' | 'target';

export type PlanSchema = {
  child_plans: Pick<PlanSchema, 'id' | 'name'>[];
  collaborators: PlanCollaboratorSlim[];
  constraint_specification: ConstraintPlanSpecification[];
  created_at: string;
  duration: string;
  id: number;
  is_locked: boolean;
  is_read_only: boolean;
  model: Model | null;
  model_id: number | null;
  name: string;
  owner: UserId;
  parent_plan:
    | (Pick<
        PlanSchema,
        'id' | 'name' | 'owner' | 'collaborators' | 'is_locked' | 'model_id' | 'start_time' | 'duration'
      > & {
        model: Pick<Model, 'id' | 'name' | 'owner' | 'version'>;
      })
    | null;
  revision: number;
  scheduling_specification: Pick<SchedulingPlanSpecification, 'id'> | null;
  simulations: [{ id: number; simulation_datasets: [{ id: number; plan_revision: number }] }];
  start_time: string;
  tags: { tag: Tag }[];
  updated_at: string;
  updated_by: UserId;
};

/**
 * PlanTransfer v3, limited to the fields the UI writes on export and reads on import. The full format, including the
 * `model` and `results` shapes, is defined by aerie-gateway `src/types/plan-transfer.ts` and its validation schema.
 */
export type PlanTransfer = Pick<PlanSchema, 'duration' | 'name' | 'start_time'> & {
  activities: (Pick<
    ActivityDirective,
    'anchor_id' | 'anchored_to_start' | 'arguments' | 'id' | 'metadata' | 'name' | 'start_offset' | 'type'
  > & { tags?: { tag: Pick<Tag, 'color' | 'name'> }[] })[];
  id?: number;
  model?: unknown;
  model_id?: number | null;
  results?: unknown;
  simulation_arguments: ArgumentsMap;
  tags?: { tag: Pick<Tag, 'color' | 'name'> }[];
  version: '3';
};

/**
 * Pre-v2 plan file, still accepted on import.
 */
export type DeprecatedPlanTransfer = Omit<PlanTransfer, 'duration' | 'simulation_arguments' | 'version'> & {
  end_time: string;
  sim_id: number;
};

export type PlanTransferResponse = {
  model_id: number;
  plan_id: number;
  plan_import_request_id: number;
};

export type PlanMetadata = Pick<
  PlanSchema,
  | 'id'
  | 'updated_at'
  | 'updated_by'
  | 'name'
  | 'owner'
  | 'created_at'
  | 'collaborators'
  | 'model'
  | 'start_time'
  | 'duration'
  | 'is_read_only'
>;

export type PlanSlim = Pick<
  Plan,
  | 'created_at'
  | 'collaborators'
  | 'duration'
  | 'end_time_doy'
  | 'id'
  | 'is_read_only'
  | 'model_id'
  | 'name'
  | 'owner'
  | 'revision'
  | 'start_time'
  | 'start_time_doy'
  | 'tags'
  | 'updated_at'
  | 'updated_by'
>;

export type PlanSlimmer = Pick<PlanSlim, 'id' | 'name' | 'owner' | 'collaborators' | 'updated_at' | 'updated_by'>;

export type PlanSchedulingSpec = Pick<
  Plan,
  'id' | 'name' | 'scheduling_specification' | 'model_id' | 'owner' | 'collaborators'
>;

export type ModelCompatabilityForPlan = {
  impacted_directives: { activity_directive: ActivityDirective; issue: ModelCompatabilityForPlanIssue }[];
  modified_activity_types: Record<string, ModelCompatabilityForPlanSchemaDiff>;
  removed_activity_types: string[];
};

export type ModelCompatabilityForPlanSchemaDiff = {
  new_parameter_schema: ParametersMap;
  old_parameter_schema: ParametersMap;
};

export type ModelCompatabilityForPlanIssue = 'altered' | 'removed';

type BasePlanImportRequest = {
  id: number;
  plan_id: number;
};
export type PlanImportRequest = PlanImportRequestSuccess | PlanImportRequestFailed;
export type PlanImportRequestSuccess = BasePlanImportRequest & {
  status: Exclude<PlanImportStatus, PlanImportStatus.FAILED>;
};
export type PlanImportRequestFailed = BasePlanImportRequest & {
  reason: ConsoleEntry;
  status: PlanImportStatus.FAILED;
};
