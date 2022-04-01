type Monaco = typeof import('monaco-editor');

interface Window {
  MonacoEnvironment: Monaco.Environment;
}
