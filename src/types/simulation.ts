import type { ActivityDirectiveId } from './activity';
import type { BaseError, SimulationDatasetError } from './errors';
import type { ArgumentsMap } from './parameter';
import type { ValueSchema } from './schema';

export type PlanDataset = {
  dataset: { profiles: Profile[] };
  offset_from_plan_start: string;
};

export type Profile = {
  dataset_id: number;
  duration: string;
  id: number;
  name: string;
  profile_segments: ProfileSegment[];
  type: {
    schema: ValueSchema;
    type: 'discrete' | 'real';
  };
};

export type ProfileSegment = {
  dataset_id: number;
  dynamics: any;
  is_gap: boolean;
  profile_id: number;
  start_offset: string;
};

/**
 * Resources are just sampled Profiles.
 */
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
  revision: number;
  simulation_end_time: string | null;
  simulation_start_time: string | null;
  template: SimulationTemplate | null;
};

export type SimulationDataset = {
  dataset_id: number;
  id: number;
  plan_revision: number;
  reason: SimulationDatasetError | null;
  simulation_end_time: string | null;
  simulation_revision: number;
  simulation_start_time: string | null;
  status: 'failed' | 'incomplete' | 'pending' | 'success';
};

export type SimulationInitialUpdateInput = {
  arguments: ArgumentsMap;
  simulation_end_time: string | null;
  simulation_start_time: string | null;
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

export type SpansMap = Record<SpanId, Span>;

export type SpanIdToDirectiveIdMap = Record<SpanId, ActivityDirectiveId>;

export type DirectiveIdToSpanIdMap = Record<ActivityDirectiveId, SpanId>;

export type SpanIdToChildIdsMap = Record<SpanId, SpanId[]>;

export type SpanUtilityMaps = {
  directiveIdToSpanIdMap: DirectiveIdToSpanIdMap;
  spanIdToChildIdsMap: SpanIdToChildIdsMap;
  spanIdToDirectiveIdMap: SpanIdToDirectiveIdMap;
};

export type Span = {
  attributes: SpanAttributes;
  dataset_id: number;
  duration: string;
  id: SpanId;
  parent_id: number | null;
  start_offset: string;
  type: string;
};
