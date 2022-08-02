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

type ExpansionSet = {
  command_dict_id: number;
  created_at: string;
  expansion_rules: ExpansionRule[];
  id: number;
  mission_model_id: number;
};

type Sequence = {
  created_at: string;
  metadata: any;
  seq_id: string;
  simulation_dataset_id: number;
  updated_at: string;
};

type SeqId = Pick<Sequence, 'seq_id'>;

type SequenceInsertInput = Omit<Sequence, 'created_at' | 'updated_at'>;

type SequenceToActivityInsertInput = {
  seq_id: string;
  simulated_activity_id: ActivitySimulatedId;
  simulation_dataset_id: number;
};
