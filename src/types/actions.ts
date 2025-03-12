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

export type ActionRunSlim = Omit<ActionRun, 'action_definition'>;

// From https://github.com/NASA-AMMOS/aerie/blob/feature/action-server-dan-changes/action-server/src/type/types.ts
export type ActionRunRequest = {
  // actionJS: string;
  parameters: any;
  settings: any;
};

/* TODO: ActionResults should be defined by the actions API and imported */
export type ActionResults = {
  data: any;
  status: 'FAILED' | 'SUCCESS';
};

export type ConsoleOutput = {
  debug: string[];
  error: string[];
  info: string[];
  log: string[];
  warn: string[];
};

export type ActionResponse =
  | {
      console: ConsoleOutput;
      errors: null;
      results: ActionResults;
    }
  | {
      console: ConsoleOutput;
      errors: {
        cause: unknown;
        message: string;
        stack: string | undefined;
      }; // TODO: should this be an error array
      results: null;
    };

export type ActionDefinitionSetInput = Pick<ActionDefinition, 'name' | 'description'>;
