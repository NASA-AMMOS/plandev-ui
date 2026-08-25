import type { ActivityFilterField } from '../enums/filter';
import type { DynamicFilter } from './filter';
import type { SpanId } from './simulation';

export type SequenceFilter = {
  filter: SequenceActivityFilter;
  id: number;
  model_id: number;
  name: string;
};

export type SequenceFilterInsertInput = Pick<SequenceFilter, 'filter' | 'model_id' | 'name'>;

export type SequenceActivityFilter = {
  dynamic_type_filters?: DynamicFilter<Pick<typeof ActivityFilterField, 'Type' | 'Subsystem'>>[];
  other_filters?: DynamicFilter<Pick<typeof ActivityFilterField, 'Tags' | 'Parameter' | 'SchedulingGoalId' | 'Name'>>[];
  static_types?: string[];
  type_subfilters?: Record<
    string,
    DynamicFilter<Pick<typeof ActivityFilterField, 'Tags' | 'Parameter' | 'SchedulingGoalId' | 'Name'>>[]
  >;
};

export type ExpansionSequenceToActivityInsertInput = {
  seq_id: string;
  simulated_activity_id: SpanId;
  simulation_dataset_id: number;
};

export type ExpansionSequence = {
  created_at: string;
  metadata: any;
  seq_id: string;
  simulation_dataset_id: number;
};

export type ExpansionSequenceInsertInput = Omit<ExpansionSequence, 'created_at' | 'updated_at'>;

export type SeqId = Pick<ExpansionSequence, 'seq_id'>;
