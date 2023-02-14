import type { ActivityDirective } from './activity';
import type { Model } from './model';
import type { SchedulingSpec } from './scheduling';

export type Plan = PlanSchema & { end_time_doy: string; start_time_doy: string };

export type PlanBranchRequestAction = 'merge' | 'pull';

export type PlanInsertInput = Pick<PlanSchema, 'duration' | 'model_id' | 'name' | 'start_time'>;

export type PlanMergeActivityOutcome = 'add' | 'delete' | 'modify' | 'none';

export type PlanMergeActivityDirective = Omit<ActivityDirective, 'plan_id'> & { snapshot_id: number };

export type PlanMergeConflictingActivity = {
  activity_id: number;
  change_type_source: PlanMergeActivityOutcome;
  change_type_target: PlanMergeActivityOutcome;
  merge_base: PlanMergeActivityDirective;
  merge_request_id: number;
  resolution: PlanMergeResolution;
  source: PlanMergeActivityDirective;
  target: PlanMergeActivityDirective;
};

export type PlanMergeNonConflictingActivity = {
  activity_id: number;
  change_type: PlanMergeActivityOutcome;
  merge_request_id: number;
  source: PlanMergeActivityDirective;
  target: PlanMergeActivityDirective | null;
};

export type PlanMergeRequestType = 'incoming' | 'outgoing';

export type PlanMergeRequestTypeFilter = PlanMergeRequestType | 'all';

export type PlanMergeRequest = PlanMergeRequestSchema & { pending: boolean; type: PlanMergeRequestType };

export type PlanMergeRequestStatus = 'accepted' | 'in-progress' | 'pending' | 'rejected' | 'withdrawn';

export type PlanMergeRequestSchema = {
  id: number;
  plan_receiving_changes: {
    id: number;
    name: string;
  };
  plan_snapshot_supplying_changes: {
    duration: string;
    name: string;
    plan_id: number;
    snapshot_id: number;
    start_time: string;
  };
  requester_username: string;
  reviewer_username: string;
  status: PlanMergeRequestStatus;
};

export type PlanMergeResolution = 'none' | 'source' | 'target';

export type PlanSchema = {
  child_plans: Pick<PlanSchema, 'id' | 'name'>[];
  duration: string;
  id: number;
  is_locked: boolean;
  model: Model;
  model_id: number;
  name: string;
  parent_plan: Pick<PlanSchema, 'id' | 'name'> | null;
  revision: number;
  scheduling_specifications: Pick<SchedulingSpec, 'id'>[];
  simulations: [{ simulation_datasets: [{ id: number }] }];
  start_time: string;
};

export type PlanSlim = Pick<
  Plan,
  'end_time_doy' | 'id' | 'model_id' | 'name' | 'revision' | 'start_time' | 'start_time_doy'
>;

export type PlanSlimmer = Pick<PlanSlim, 'id' | 'start_time' | 'end_time_doy'>;

export type PlanSchedulingSpec = Pick<Plan, 'id' | 'name' | 'scheduling_specifications' | 'model_id'>;
