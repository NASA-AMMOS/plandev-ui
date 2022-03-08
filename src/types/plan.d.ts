type CreatePlan = {
  endTime: string;
  id: number;
  modelId: number;
  name: string;
  revision: number;
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
  revision: number;
  scheduling_specifications: Pick<SchedulingSpec, 'id'>[];
  simulations: Simulation[];
  startTime: string;
};
