type Plan = PlanSchema & { end_time_doy: string; start_time_doy: string };

type PlanBranchRequestAction = 'merge' | 'pull';

type PlanInsertInput = Pick<PlanSchema, 'duration' | 'model_id' | 'name' | 'start_time'>;

type PlanMergeActivityOutcome = 'add' | 'delete' | 'modify' | 'none';

type PlanMergeActivityDirective = Omit<ActivityDirective, 'plan_id'> & { snapshot_id: number };

type PlanMergeConflictingActivity = {
  activity_id: number;
  change_type_source: PlanMergeActivityOutcome;
  change_type_target: PlanMergeActivityOutcome;
  merge_base: PlanMergeActivityDirective;
  merge_request_id: number;
  resolution: PlanMergeResolution;
  source: PlanMergeActivityDirective;
  target: PlanMergeActivityDirective;
};

type PlanMergeNonConflictingActivity = {
  activity_id: number;
  change_type: PlanMergeActivityOutcome;
  merge_request_id: number;
  source: PlanMergeActivityDirective;
  target: PlanMergeActivityDirective;
};

type PlanMergeRequestType = 'incoming' | 'outgoing';

type PlanMergeRequestTypeFilter = PlanMergeRequestType | 'all';

type PlanMergeRequest = PlanMergeRequestSchema & { pending: boolean; type: PlanMergeRequestType };

type PlanMergeRequestStatus = 'accepted' | 'in-progress' | 'pending' | 'rejected' | 'withdrawn';

type PlanMergeRequestSchema = {
  id: number;
  plan_receiving_changes: {
    id: number;
    name: string;
  };
  plan_snapshot_supplying_changes: {
    name: string;
    snapshot_id: number;
  };
  requester_username: string;
  reviewer_username: string;
  status: PlanMergeRequestStatus;
};

type PlanMergeResolution = 'none' | 'source' | 'target';

type PlanSchema = {
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

type PlanSlim = Pick<Plan, 'end_time_doy' | 'id' | 'model_id' | 'name' | 'revision' | 'start_time' | 'start_time_doy'>;
