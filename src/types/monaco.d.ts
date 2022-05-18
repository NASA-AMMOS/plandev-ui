type Monaco = typeof import('monaco-editor');

interface Window {
  MonacoEnvironment: Monaco.Environment;
}

type TypeScriptResponse = {
  reason: string;
  status: 'failure' | 'success';
  typescriptFiles: TypeScriptExtraLib[];
};

type TypeScriptExtraLib = {
  content: string;
  filePath: string;
};
