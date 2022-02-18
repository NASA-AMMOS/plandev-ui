import type { editor as Editor } from 'monaco-editor/esm/vs/editor/editor.api';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

export async function createMonacoEditor(
  domElement: HTMLElement,
  options?: Editor.IStandaloneEditorConstructionOptions,
  override?: Editor.IEditorOverrideServices,
): Promise<Editor.IStandaloneCodeEditor> {
  self.MonacoEnvironment = self.MonacoEnvironment ?? {
    getWorker(_moduleId: unknown, label: string): Worker {
      if (label === 'json') {
        return new jsonWorker();
      }
      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker();
      }
      return new editorWorker();
    },
  };

  const monaco = await import('monaco-editor');
  const editor = monaco.editor.create(domElement, options, override);

  return editor;
}
