type CreatePlan = {
  endTime: string;
  id: number;
  modelId: number;
  name: string;
  startTime: string;
};

type CreatePlanModel = {
  id: number;
  name: string;
};

type Plan = {
  activities: Activity[];
  constraints: Constraint[];
  duration: string;
  endTime: string;
  id: number;
  model: Model;
  name: string;
  simulations: Simulation[];
  startTime: string;
};
