export type ExpandedTemplate = {
  created_at: string;
  expanded_template: string;
  id: number;
  seq_id: string;
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
