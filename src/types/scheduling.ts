import type { SchedulingError } from './errors';
import type { ArgumentsMap } from './parameter';

export type SchedulingGoal = {
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

export type SchedulingCondition = {
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

export type SchedulingGoalAnalysis = {
  analysis_id: number;
  satisfied: boolean;
  satisfying_activities: { activity_id: number }[];
};

export type SchedulingConditionInsertInput = Omit<
  SchedulingCondition,
  'created_date' | 'id' | 'modified_date' | 'revision'
>;

export type SchedulingGoalInsertInput = Omit<
  SchedulingGoal,
  'analyses' | 'created_date' | 'id' | 'modified_date' | 'revision'
>;

export type SchedulingResponse = {
  reason: SchedulingError;
  status: 'complete' | 'failed' | 'incomplete';
};

export type SchedulingSpec = {
  analysis_only: boolean;
  horizon_end: string;
  horizon_start: string;
  id: number;
  plan_id: number;
  plan_revision: number;
  revision: number;
  simulation_arguments: ArgumentsMap;
};

export type SchedulingSpecInsertInput = Omit<SchedulingSpec, 'id' | 'revision'>;

export type SchedulingSpecCondition = {
  condition: SchedulingCondition;
  enabled: boolean;
  specification: SchedulingSpec;
  specification_id: number;
};

export type SchedulingSpecGoal = {
  enabled: boolean;
  goal: SchedulingGoal;
  priority: number;
  specification_id: number;
};

export type SchedulingSpecConditionInsertInput = {
  condition_id: number;
  enabled: boolean;
  specification_id: number;
};

export type SchedulingSpecGoalInsertInput = {
  enabled: boolean;
  goal_id: number;
  specification_id: number;
};
