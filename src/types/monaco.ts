import type { Environment } from 'monaco-editor';

export type Monaco = typeof import('monaco-editor');

export interface Window {
  MonacoEnvironment: Environment;
}

export type DslTypeScriptResponse = {
  reason: string;
  status: 'failure' | 'success';
  typescriptFiles: TypeScriptFile[];
};

export type TypeScriptFile = {
  content: string;
  filePath: string;
};
