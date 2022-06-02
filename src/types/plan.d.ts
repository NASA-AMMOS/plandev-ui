type PlanList = {
  end_time: string;
  id: number;
  model_id: number;
  name: string;
  revision: number;
  start_time: string;
};

type Plan = {
  activities: Activity[];
  constraints: Constraint[];
  duration: string;
  end_time: string;
  id: number;
  model: Model;
  name: string;
  revision: number;
  scheduling_specifications: Pick<SchedulingSpec, 'id'>[];
  simulations: Simulation[];
  start_time: string;
};

type PlanInsertInput = {
  duration: string;
  model_id: number;
  name: string;
  start_time: string;
};
