import type { ActivityDirectiveId } from './activity';
import type { UserId } from './app';
import type { ConsoleEntry } from './console';
import type { ArgumentsMap } from './parameter';
import type { ValueSchema } from './schema';

export type PlanDataset = {
  dataset: { profiles: Profile[] };
  dataset_id: number;
  offset_from_plan_start: string;
  simulation_dataset_id: number | null;
};

export type PlanDatasetNames = {
  dataset: { profiles: { name: string }[] };
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

export type ResourceRequest = {
  error: string;
  loading: boolean;
  resource: Resource | null;
  simulationDatasetId: number;
  type: 'internal' | 'external';
  unsubscribe?: () => void;
};

export type ResourceType = {
  name: string;
  schema: ValueSchema;
};

export type ResourceValue = {
  is_gap?: boolean;
  /**
   * Set on the second of the two values a *discrete* profile segment produces: the one that exists
   * only to carry the segment's value forward to the next segment's start, which is what renders a
   * discrete profile as a staircase. A layer interpolating between segments drops these.
   * Absent on real-profile values, whose second value is a genuinely different number derived from
   * the segment's rate of change.
   */
  is_hold?: boolean;
  x: number;
  y: number | string | null;
};

export type RawSimulationEvent = {
  causal_time: string;
  real_time: string;
  topic_index: number;
  transaction_index: number;
  value: any;
};

export type SimulationEvent = {
  dense_time: string;
  id: number;
  span_id: number;
  start_offset: string;
  topic: string;
  value: string;
};

export type SimulateResponse = {
  reason: ConsoleEntry;
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
  arguments: ArgumentsMap;
  canceled: boolean;
  dataset_id: number;
  extent: { extent: string | null } | null;
  id: number;
  model_id: number;
  model_revision: number;
  plan_revision: number;
  reason: ConsoleEntry | null;
  requested_at: string;
  requested_by: string;
  simulation_end_time: string | null;
  simulation_revision: number;
  simulation_start_time: string | null;
  status: 'failed' | 'incomplete' | 'pending' | 'success';
};

export type SimulationDatasetSlim = Pick<SimulationDataset, 'canceled' | 'id' | 'status'>;

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
  owner: UserId;
};

export type SimulationTemplateInsertInput = {
  arguments: ArgumentsMap;
  description: string;
  model_id: number;
};

export type SimulationTemplateSetInput = Partial<SimulationTemplateInsertInput>;

export type SimulationDatasetReason = {
  errors: {
    [activityId: string]: ConsoleEntry;
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

export type SpanDB = {
  attributes: SpanAttributes;
  dataset_id: number;
  duration: string;
  durationMs: number;
  endMs: number;
  parent_id: number | null;
  span_id: SpanId;
  startMs: number;
  start_offset: string;
  type: string;
};

export type Span = SpanDB & {
  durationMs: number;
  endMs: number;
  startMs: number;
};

export type Topic = {
  name: string;
  topic_index: number;
  value_schema: ValueSchema;
};
