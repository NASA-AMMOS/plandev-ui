type CreateModel = {
  id: number;
  jarId: number;
  name: string;
  version: string;
};

type Model = {
  activityTypes: ActivityType[];
  constraints: Constraint[];
  id: number;
  parameters: { parameters: ParametersMap };
};
