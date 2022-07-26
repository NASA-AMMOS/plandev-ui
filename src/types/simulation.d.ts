type ProfilesExternalResponse = {
  datasets: [{ dataset: { profiles: Profile[] }; offset_from_plan_start: string }];
  duration: string;
  start_time: string;
};

type ProfilesSimulationResponse = {
  duration: string;
  simulations: [{ datasets: [{ dataset: { profiles: Profile[] } }] }];
  start_time: string;
};

type Profile = {
  name: string;
  profile_segments: ProfileSegment[];
  type: {
    schema?: ValueSchema;
    type: 'discrete' | 'real';
  };
};

type ProfileSegment = {
  dynamics: any;
  start_offset: string;
};

type Simulation = {
  arguments: ArgumentsMap;
  datasets: SimulationDataset[] | null;
  id: number;
  template: SimulationTemplate | null;
};

type SimulationInsertInput = {
  arguments: ArgumentsMap;
  plan_id: number;
  simulation_template_id: number | null;
};

type SimulationTemplate = {
  arguments: ArgumentsMap;
  description: string;
  id: number;
};

type Resource = {
  name: string;
  schema: ValueSchema;
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

type SimulationDataset = {
  id: number;
};

type SimulationStatus = 'complete' | 'failed' | 'incomplete' | 'pending';

type SimulationResponse = {
  status: SimulationStatus;
};
