import type { ParametersMap } from './parameter';

export type Model = ModelSchema;

export type ModelInsertInput = Pick<Model, 'description' | 'jar_id' | 'mission' | 'name' | 'version'>;

export type ModelSchema = {
  created_at: string;
  description?: string;
  id: number;
  jar_id: number;
  mission: string;
  name: string;
  owner: string;
  parameters: { parameters: ParametersMap };
  plans: { id: number }[];
  version: string;
};

export type ModelSlim = Pick<
  Model,
  'created_at' | 'description' | 'id' | 'jar_id' | 'name' | 'plans' | 'owner' | 'version'
>;
