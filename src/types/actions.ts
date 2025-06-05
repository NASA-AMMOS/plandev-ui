import type { ActionValueSchema } from '@nasa-jpl/aerie-actions';
import type { ArgumentsMap, ParameterName } from './parameter';

export type ActionParameter = { order: number; schema: ActionValueSchema; unit?: string };
export type ActionParametersMap = Record<ParameterName, ActionParameter>;

export type ActionDefinition = {
  action_file_id: number;
  created_at: string;
  description: string;
  id: number;
  name: string;
  owner: string | null;
  parameter_schema: Record<string, ActionValueSchema>;
  settings: ArgumentsMap;
  settings_schema: Record<string, ActionValueSchema>;
  updated_at: string;
  updated_by: string | null;
  workspace_id: number;
};

export type ActionRun = {
  action_definition: ActionDefinition;
  action_definition_id: number;
  duration: number | null;
  error: {
    message: string;
    stack: string | undefined;
  } | null;
  id: number;
  logs: string | null;
  parameters: ArgumentsMap;
  requested_at: string;
  requested_by: string | null;
  results: {
    data: any;
    status: 'FAILED' | 'SUCCESS';
    [key: string]: any;
  } | null;
  settings: ArgumentsMap;
  status: 'pending' | 'incomplete' | 'failed' | 'success';
};

export type ActionRunSlim = Omit<ActionRun, 'action_definition'> & {
  action_definition: {
    workspace_id: number;
  };
};

export type ActionDefinitionSetInput = Pick<ActionDefinition, 'name' | 'description'>;
