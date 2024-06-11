import type { UserId } from './app';
import type { ConstraintModelSpec } from './constraint';
import type { ParametersMap } from './parameter';
import type { SchedulingConditionModelSpecification, SchedulingGoalModelSpecification } from './scheduling';
import type { View } from './view';

export type Model = ModelSchema;

export type ModelInsertInput = Pick<Model, 'description' | 'jar_id' | 'mission' | 'name' | 'version'>;
export type ModelSetInput = Pick<Model, 'description' | 'mission' | 'name' | 'owner' | 'version'>;

export type ModelSchema = {
  constraint_specification: ConstraintModelSpec[];
  created_at: string;
  description?: string;
  id: number;
  jar_id: number;
  mission: string;
  name: string;
  owner: UserId;
  parameters: { parameters: ParametersMap };
  plans: { id: number }[];
  scheduling_specification_conditions: SchedulingConditionModelSpecification[];
  scheduling_specification_goals: SchedulingGoalModelSpecification[];
  version: string;
  view: View | null;
};

export type ModelSlim = Pick<
  Model,
  'created_at' | 'description' | 'id' | 'jar_id' | 'name' | 'plans' | 'owner' | 'version'
>;
