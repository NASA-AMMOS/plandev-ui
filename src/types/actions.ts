import type { ArgumentsMap } from './parameter';
import type { ValueSchema } from './schema';

export type ActionDefinition = {
  action_file_id: number;
  created_at: string;
  description: string;
  id: number;
  name: string;
  owner: string | null;
  parameter_schema: Record<string, ValueSchema>;
  settings: ArgumentsMap;
  settings_schema: Record<string, ValueSchema>;
  updated_at: string;
  updated_by: string | null;
  workspace_id: number;
};

export type ActionRun = {
  action_definition: ActionDefinition;
  action_definition_id: number;
  created_at: string;
  created_by: string | null;
  duration: number | null;
  error: any | null;
  id: number;
  logs: string | null;
  parameters: ArgumentsMap;
  results: any | null;
  settings: ArgumentsMap;
  status: 'pending' | 'in-progress' | 'failed' | 'complete';
};

export type ActionRunSlim = Omit<ActionRun, 'action_definition'> & {
  action_definition: {
    workspace_id: number;
  };
};

export type ActionDefinitionSetInput = Pick<ActionDefinition, 'name' | 'description'>;
