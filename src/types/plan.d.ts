type Plan = PlanSchema & { end_time_doy: string; start_time_doy: string };

type PlanBranchRequestAction = 'merge' | 'pull';

type PlanInsertInput = Pick<PlanSchema, 'duration' | 'model_id' | 'name' | 'start_time'>;

type PlanMergeRequestType = 'incoming' | 'outgoing';

type PlanMergeRequest = PlanMergeRequestSchema & { type: PlanMergeRequestType };

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
  status: 'accepted' | 'in-progress' | 'pending' | 'rejected' | 'withdrawn';
};

type PlanSchema = {
  child_plans: Pick<PlanSchema, 'id' | 'name'>[];
  duration: string;
  id: number;
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
