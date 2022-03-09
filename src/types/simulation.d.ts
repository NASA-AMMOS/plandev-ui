type Simulation = {
  arguments: ArgumentsMap;
  id: number;
  template: SimulationTemplate | null;
};

type SimulationTemplate = {
  arguments: ArgumentsMap;
  description: string;
  id: number;
};

type Resource = {
  name: string;
  schema: ValueSchema;
  startTime: string;
  values: ResourceValue[];
};

type ResourceType = {
  name: string;
  schema: ValueSchema;
};

type ResourceValue = {
  x: number;
  y: number | string;
};

type SimulationResponseActivity = Omit<Activity, 'id' | 'startTime'> & {
  computedAttributes: string;
  startTimestamp: string;
};

type SimulationResponseViolation = Omit<ConstraintViolation, 'constraint'>;

type SimulateResponseStatus = 'complete' | 'failed' | 'incomplete';

type SimulateResponse = {
  results?: {
    activities: Record<string, SimulationResponseActivity>;
    constraints: Record<string, SimulationResponseViolation[]>;
    resources: Record<string, ResourceValue[]>;
    start: string;
  };
  status: SimulateResponseStatus;
};
