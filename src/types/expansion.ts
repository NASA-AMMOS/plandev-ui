import type { SpanId } from './simulation';

export type ExpansionRule = {
  activity_type: string;
  authoring_command_dict_id: number;
  authoring_mission_model_id: number;
  created_at: string;
  expansion_logic: string;
  id: number;
  updated_at: string;
};

export type ExpansionRuleInsertInput = Omit<ExpansionRule, 'created_at' | 'id' | 'updated_at'>;

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
  updated_at: string;
};

export type ExpansionSequenceInsertInput = Omit<ExpansionSequence, 'created_at' | 'updated_at'>;

export type ExpansionSet = {
  command_dict_id: number;
  created_at: string;
  expansion_rules: ExpansionRule[];
  id: number;
  mission_model_id: number;
};

export type SeqId = Pick<ExpansionSequence, 'seq_id'>;
