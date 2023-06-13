import type { SeqJson } from './sequencing';
import type { SpanId } from './simulation';

export type ExpansionRule = {
  activity_type: string;
  authoring_command_dict_id: number;
  authoring_mission_model_id: number;
  created_at: string;
  description: string;
  expansion_logic: string;
  id: number;
  name: string;
  owner: string;
  updated_at: string;
  updated_by: string;
};

export type ExpansionRuleInsertInput = Omit<ExpansionRule, 'created_at' | 'id' | 'updated_at' | 'updated_by' | 'owner'>;

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

export type ExpansionSet = {
  command_dict_id: number;
  created_at: string;
  description: string;
  expansion_rules: ExpansionRule[];
  id: number;
  mission_model_id: number;
  name: string;
  owner: string;
  updated_at: string;
  updated_by: string;
};

export type SeqId = Pick<ExpansionSequence, 'seq_id'>;

export type ActivityInstanceJoin = {
  simulated_activity: {
    activity_type_name: string;
    id: number;
  };
};

export type ExpandedSequence = {
  created_at: string;
  edsl_string: string;
  expanded_sequence: SeqJson;
  id: number;
  seq_id: string;
  sequence: {
    activity_instance_joins: ActivityInstanceJoin[];
  };
};

export type ExpansionRun = {
  created_at: string;
  expanded_sequences: ExpandedSequence[];
  expansion_set: ExpansionSet;
  id: number;
  simulation_dataset: {
    dataset_id: number;
    simulation: {
      plan: {
        id: number;
        name: string;
      };
    };
  };
};
