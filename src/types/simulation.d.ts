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
  schema: any;
  startTime: string;
  values: ResourceValue[];
};

type ResourceType = {
  name: string;
  schema: { type: string } & any;
};

type ResourceValue = {
  x: number;
  y: number | string;
};

type SimulateResponse = {
  results?: {
    activities: {
      [id: string]: {
        arguments: ArgumentsMap;
        children: string[];
        duration: number;
        parent: string | null;
        startTimestamp: string;
        type: string;
      };
    };
    constraints: { [name: string]: any[] };
    resources: { [name: string]: ResourceValue[] };
    start: string;
  };
  status: 'complete' | 'failed' | 'incomplete';
};
