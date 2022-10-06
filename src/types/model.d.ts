type Model = ModelSchema;

type ModelInsertInput = Pick<Model | 'jar_id' | 'mission' | 'name' | 'version'>;

type ModelSchema = {
  activity_types: ActivityType[];
  id: number;
  jar_id: number;
  name: string;
  parameters: { parameters: ParametersMap };
  version: string;
};

type ModelSlim = Pick<Model, 'id' | 'jar_id' | 'name' | 'version'>;
