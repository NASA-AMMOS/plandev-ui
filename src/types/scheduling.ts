import type { SchedulingError } from './errors';
import type { ArgumentsMap } from './parameter';
import type { Tag } from './tags';

export type SchedulingGoal = {
  analyses: SchedulingGoalAnalysis[];
  author: string | null;
  created_date: string;
  definition: string;
  description?: string;
  id: number;
  last_modified_by: string | null;
  model_id: number;
  modified_date: string;
  name: string;
  revision: number;
  scheduling_specification_goal: {
    specification_id: number;
  };
  tags: { tag: Tag }[];
};

export type SchedulingGoalSlim = Omit<SchedulingGoal, 'tags'> & { tags: { tag_id: number }[] };

export type SchedulingCondition = {
  author: string | null;
  created_date: string;
  definition: string;
  description?: string;
  id: number;
  last_modified_by: string | null;
  model_id: number;
  modified_date: string;
  name: string;
  revision: number;
  scheduling_specification_conditions: {
    specification_id: number;
  }[];
};

export type SchedulingGoalAnalysis = {
  analysis_id: number;
  satisfied: boolean;
  satisfying_activities: { activity_id: number }[];
};

export type SchedulingConditionInsertInput = Omit<
  SchedulingCondition,
  | 'author'
  | 'created_date'
  | 'id'
  | 'last_modified_by'
  | 'modified_date'
  | 'revision'
  | 'scheduling_specification_conditions'
>;

export type SchedulingGoalInsertInput = Omit<
  SchedulingGoal,
  | 'analyses'
  | 'author'
  | 'created_date'
  | 'id'
  | 'last_modified_by'
  | 'modified_date'
  | 'revision'
  | 'scheduling_specification_goal'
  | 'tags'
>;

export type SchedulingResponse = {
  datasetId: number | null;
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
  goal: SchedulingGoalSlim;
  priority: number;
  simulate_after: boolean;
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
