type ModelList = {
  id: number;
  jar_id: number;
  name: string;
  version: string;
};

type ModelInsertInput = {
  jar_id: number;
  mission: string;
  name: string;
  version: string;
};

type Model = {
  activity_types: ActivityType[];
  constraints: Constraint[];
  id: number;
  parameters: { parameters: ParametersMap };
};
