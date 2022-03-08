type SchedulingGoal = {
  author: string | null;
  created_date: string;
  definition: string;
  description: string | null;
  id: number;
  last_modified_by: string | null;
  model_id: number;
  modified_date: string;
  name: string;
  revision: number;
};

type SchedulingGoalInsertInput = Omit<
  SchedulingGoal,
  'created_date' | 'id' | 'modified_date' | 'revision'
>;

type SchedulingResponse = {
  reason?: string;
  results?: SchedulingResults;
  status: 'complete' | 'failed';
};

type SchedulingResults = {
  activityCount: number;
  goalScores: Record<string, number>;
};

type SchedulingSpec = {
  horizon_end: string;
  horizon_start: string;
  id: number;
  plan_id: number;
  plan_revision: number;
  revision: number;
  simulation_arguments: ArgumentsMap;
};

type SchedulingSpecInsertInput = Omit<SchedulingSpec, 'id' | 'revision'>;

type SchedulingSpecGoal = {
  goal: SchedulingGoal;
  priority: number;
  specification: SchedulingSpec;
};

type SchedulingSpecGoalInsertInput = {
  goal_id: number;
  priority: number;
  specification_id: number;
};
