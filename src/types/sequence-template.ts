import type { ActivityLayerFilter } from "./timeline";

export type ExpandedTemplate = {
  created_at: string;
  expanded_template: string;
  filter_id: number;
  id: number;
  simulation_dataset_id: number;
};

export type SequenceTemplate = {
  activity_type: string;
  id: number;
  language: string;
  model_id: number;
  name: string;
  owner: string;
  parcel_id: number;
  template_definition: string;
};

export type SequenceTemplateInsertInput = Omit<SequenceTemplate, 'id' | 'owner'>;

export type SequenceActivityFilter = ActivityLayerFilter;

export type SequenceFilter = {
  filter: SequenceActivityFilter;
  id: number;
  model_id: number;
  name: string;
};

export type SequenceFilterInsertInput = Pick<SequenceFilter, 'filter' | 'model_id' | 'name'>;

export type SequenceRun = {
  fragments: SequenceFragment[];
  id: number;
  sequenceFilterId: number;
};

export type SequenceFragment = {
  activityId: number;
  createdAt: string;
  endTime: string;
  id: number;
  output: string;
  planId: number;
  startTime: string;
};
