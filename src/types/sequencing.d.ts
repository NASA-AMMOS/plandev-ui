type CommandDictionary = {
  command_types_typescript_path: string;
  created_at: string;
  id: number;
  mission: string;
  updated_at: string;
  version: string;
};

type UserSequence = {
  authoring_command_dict_id: number;
  created_at: string;
  definition: string;
  id: number;
  name: string;
  owner: string;
  updated_at: string;
};

type UserSequenceInsertInput = Omit<UserSequence, 'created_at' | 'id' | 'updated_at'>;
