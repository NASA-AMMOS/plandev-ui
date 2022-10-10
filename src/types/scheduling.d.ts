type SchedulingGoal = {
  analyses: SchedulingGoalAnalysis[];
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

type SchedulingGoalAnalysis = {
  satisfied: boolean;
  satisfying_activities: { activity_id: number }[];
};

type SchedulingGoalInsertInput = Omit<
  SchedulingGoal,
  'analyses' | 'created_date' | 'id' | 'modified_date' | 'revision'
>;

type SchedulingResponse = {
  reason: SchedulingError;
  status: 'complete' | 'failed' | 'incomplete';
};

type SchedulingSpec = {
  analysis_only: boolean;
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
  enabled: boolean;
  goal: SchedulingGoal;
  priority: number;
  specification_id: number;
};

type SchedulingSpecGoalInsertInput = {
  enabled: boolean;
  goal_id: number;
  specification_id: number;
};
