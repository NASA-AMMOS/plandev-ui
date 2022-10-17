type Dataset = {
  profiles: Profile[];
  spans: Span[];
};

type ProfilesExternalResponse = {
  datasets: [{ dataset: Dataset; offset_from_plan_start: string }];
  duration: string;
  start_time: string;
};

type Profile = {
  name: string;
  profile_segments: ProfileSegment[];
  type: {
    schema: ValueSchema;
    type: 'discrete' | 'real';
  };
};

type ProfileSegment = {
  dynamics: any;
  start_offset: string;
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

type SimulateResponse = {
  reason: SimulationDatasetError;
  simulationDatasetId: number;
  status: 'complete' | 'failed' | 'incomplete' | 'pending';
};

type Simulation = {
  arguments: ArgumentsMap;
  id: number;
  template: SimulationTemplate | null;
};

type SimulationDataset = {
  dataset: Dataset;
  id: number;
  plan_revision: number;
  reason: SimulationDatasetError | null;
  status: 'failed' | 'incomplete' | 'pending' | 'success';
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

type SimulationDatasetReason = {
  errors: {
    [activityId: string]: BaseError;
  };
  success: boolean;
};

type SpanAttributes = {
  arguments: ArgumentsMap;
  computedAttributes: ArgumentsMap;
  directiveId?: number;
};

type SpanId = number;

type Span = {
  attributes: SpanAttributes;
  dataset_id: number;
  duration: string;
  id: SpanId;
  parent_id: number | null;
  start_offset: string;
  type: string;
};
