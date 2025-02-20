export type Action = {
  actionJS: string;
  description: string;
  id: number;
  name: string;
};

export type ActionRun = {
  actionId: number;
  id: number;
  response: ActionResponse;
  user: string;
};

// From https://github.com/NASA-AMMOS/aerie/blob/feature/action-server-dan-changes/action-server/src/type/types.ts
export type ActionRunRequest = {
  actionJS: string;
  parameters: Record<string, any>;
  settings: Record<string, any>;
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
