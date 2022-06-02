type CommandDictionary = {
  command_types_typescript_path: string;
  id: number;
  mission: string;
  version: string;
};

type ExpansionRule = {
  activity_type: string;
  authoring_command_dict_id: number;
  authoring_mission_model_id: number;
  expansion_logic: string;
  id: number;
};

type ExpansionRuleInsertInput = Omit<ExpansionRule, 'id'>;

type ExpansionSet = {
  command_dict_id: number;
  expansion_rules: ExpansionRule[];
  id: number;
  mission_model_id: number;
};

type Sequence = {
  metadata: any;
  seq_id: string;
  simulation_dataset_id: number;
};

type SeqJson = any;
