import type { BaseError, SimulationDatasetError } from './errors';
import type { ArgumentsMap } from './parameter';
import type { ValueSchema } from './schema';

export type Dataset = {
  profiles: Profile[];
  spans: Span[];
};

export type ProfilesExternalResponse = {
  datasets: [{ dataset: Dataset; offset_from_plan_start: string }];
  duration: string;
  start_time: string;
};

export type Profile = {
  name: string;
  profile_segments: ProfileSegment[];
  type: {
    schema: ValueSchema;
    type: 'discrete' | 'real';
  };
};

export type ProfileSegment = {
  dynamics: any;
  start_offset: string;
};

export type Resource = {
  name: string;
  schema: ValueSchema;
  values: ResourceValue[];
};

export type ResourceType = {
  name: string;
  schema: ValueSchema;
};

export type ResourceValue = {
  x: number;
  y: number | string;
};

export type SimulateResponse = {
  reason: SimulationDatasetError;
  simulationDatasetId: number;
  status: 'complete' | 'failed' | 'incomplete' | 'pending';
};

export type Simulation = {
  arguments: ArgumentsMap;
  id: number;
  template: SimulationTemplate | null;
};

export type SimulationDataset = {
  dataset: Dataset;
  id: number;
  plan_revision: number;
  reason: SimulationDatasetError | null;
  status: 'failed' | 'incomplete' | 'pending' | 'success';
};

export type SimulationInsertInput = {
  arguments: ArgumentsMap;
  plan_id: number;
  simulation_template_id: number | null;
};

export type SimulationTemplate = {
  arguments: ArgumentsMap;
  description: string;
  id: number;
};

export type SimulationDatasetReason = {
  errors: {
    [activityId: string]: BaseError;
  };
  success: boolean;
};

export type SpanAttributes = {
  arguments: ArgumentsMap;
  computedAttributes: ArgumentsMap;
  directiveId?: number;
};

export type SpanId = number;

export type Span = {
  attributes: SpanAttributes;
  dataset_id: number;
  duration: string;
  id: SpanId;
  parent_id: number | null;
  start_offset: string;
  type: string;
};
