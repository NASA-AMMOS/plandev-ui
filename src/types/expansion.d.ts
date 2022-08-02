type CommandDictionary = {
  command_types_typescript_path: string;
  created_at: string;
  id: number;
  mission: string;
  version: string;
};

type ExpansionRule = {
  activity_type: string;
  authoring_command_dict_id: number;
  authoring_mission_model_id: number;
  created_at: string;
  expansion_logic: string;
  id: number;
  updated_at: string;
};

type ExpansionRuleInsertInput = Omit<ExpansionRule, 'created_at' | 'id' | 'updated_at'>;

type ExpansionSequenceToActivityInsertInput = {
  seq_id: string;
  simulated_activity_id: ActivitySimulatedId;
  simulation_dataset_id: number;
};

type ExpansionSequence = {
  created_at: string;
  metadata: any;
  seq_id: string;
  simulation_dataset_id: number;
  updated_at: string;
};

type ExpansionSequenceInsertInput = Omit<ExpansionSequence, 'created_at' | 'updated_at'>;

type ExpansionSet = {
  command_dict_id: number;
  created_at: string;
  expansion_rules: ExpansionRule[];
  id: number;
  mission_model_id: number;
};

type SeqId = Pick<ExpandedSequence, 'seq_id'>;
