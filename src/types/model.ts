import type { ParametersMap } from './parameter';

export type Model = ModelSchema;

export type ModelInsertInput = Pick<Model, 'jar_id' | 'mission' | 'name' | 'version'>;

export type ModelSchema = {
  id: number;
  jar_id: number;
  mission: string;
  name: string;
  parameters: { parameters: ParametersMap };
  plans: { id: number }[];
  version: string;
};

export type ModelSlim = Pick<Model, 'id' | 'jar_id' | 'name' | 'plans' | 'version'>;
