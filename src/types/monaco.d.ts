type Monaco = typeof import('monaco-editor');

interface Window {
  MonacoEnvironment: Monaco.Environment;
}

type DslTypeScriptResponse = {
  reason: string;
  status: 'failure' | 'success';
  typescriptFiles: TypeScriptFile[];
};

type TypeScriptFile = {
  content: string;
  filePath: string;
};
