type CommandDictionary = {
  command_types_typescript_path: string;
  created_at: string;
  id: number;
  mission: string;
  updated_at: string;
  version: string;
};

type GetSeqJsonResponseError = {
  location: {
    column: number;
    line: number;
  };
  message: string;
  stack: string;
};

type GetSeqJsonResponse = {
  errors: GetSeqJsonResponseError[];
  seqJson: SeqJson;
  status: 'FAILURE' | 'SUCCESS';
};

type SeqJson = any; // TODO: Strongly type.

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
