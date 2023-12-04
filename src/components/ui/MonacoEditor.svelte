<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import { base } from '$app/paths';
  import type {
    CancellationToken,
    editor as Editor,
    IDisposable,
    Range,
    Uri,
    languages,
  } from 'monaco-editor/esm/vs/editor/editor.api';
  import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
  import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import type { Monaco } from '../../types/monaco';
  import { ShouldRetryError, promiseRetry } from '../../utilities/generic';
  export { className as class };
  export { styleName as style };
  export let automaticLayout: boolean | undefined = undefined;
  export let actionProvider: (
    model: Editor.ITextModel,
    range: Range,
    context: languages.CodeActionContext,
    token: CancellationToken,
  ) => languages.ProviderResult<languages.CodeActionList> | undefined = () => {
    return {
      actions: [],
      dispose: () => {
        //dispose
      },
    };
  };
  export let fixedOverflowWidgets: boolean | undefined = undefined;
  export let language: string | undefined = undefined;
  export let lineNumbers: Editor.LineNumbersType | undefined = undefined;
  export let minimap: Editor.IEditorMinimapOptions | undefined = undefined;
  export let model: Editor.ITextModel | null | undefined = undefined;
  export let monaco: Monaco | undefined = undefined;
  export let override: Editor.IEditorOverrideServices | undefined = undefined;
  export let readOnly: boolean | undefined = undefined;
  export let scrollBeyondLastLine: boolean | undefined = undefined;
  export let tabSize: number | undefined = undefined;
  export let theme: string | undefined = undefined;
  export let value: string | null | undefined = undefined;

  type TypeScriptWorker = languages.typescript.TypeScriptWorker;

  const dispatch = createEventDispatcher<{
    didChangeModelContent: { e: Editor.IModelContentChangedEvent; value: string };
    fullyLoaded: { model: Editor.ITextModel; worker: TypeScriptWorker };
  }>();

  let className: string = '';
  let div: HTMLDivElement;
  let editor: Editor.IStandaloneCodeEditor | undefined = undefined;
  let codeActionProvider: IDisposable | undefined = undefined;
  let editor_load_event: IDisposable | undefined = undefined;
  let styleName: string = '';

  $: if (editor) {
    const currentValue = editor.getValue();
    if (value !== currentValue) {
      const scrollTop = editor.getScrollTop(); // setValue can nuke scroll position.
      editor?.getModel()?.setValue(value ?? ''); // Make sure value is not null or Monaco throws.
      editor.setScrollPosition({ scrollTop });
    }
  }
  $: if (editor && readOnly !== undefined) {
    editor.updateOptions({ readOnly });
  }

  onMount(async () => {
    self.MonacoEnvironment = {
      getWorker(_moduleId: unknown, label: string): Worker {
        if (label === 'json') {
          return new jsonWorker();
        }
        if (label === 'typescript' || label === 'javascript') {
          // Force the worker to be loaded in the classic style, served directly out of static
          // https://thethoughtfulkoala.com/posts/2021/07/10/vite-js-classic-web-worker.html
          return new Worker(`${base}/ts.worker.js`, { type: 'classic' });
        }
        return new editorWorker();
      },
    };

    const options: Editor.IStandaloneEditorConstructionOptions = {
      automaticLayout,
      fixedOverflowWidgets,
      language,
      lightbulb: { enabled: true },
      lineNumbers,
      minimap,
      model,
      readOnly,
      scrollBeyondLastLine,
      tabSize,
      theme,
      ...(value !== null && { value }),
    };
    monaco = await import('monaco-editor');
    editor = monaco.editor.create(div, options, override);

    if (language && language === 'typescript') {
      monaco.languages.typescript.typescriptDefaults.setWorkerOptions({
        customWorkerPath: `${base}/customTS.worker.js`,
      });

      if (actionProvider) {
        codeActionProvider = monaco.languages.registerCodeActionProvider(language, {
          provideCodeActions: actionProvider,
        });
      }

      editor.onDidChangeModelContent((e: Editor.IModelContentChangedEvent) => {
        const newValue = editor?.getModel()?.getValue();
        if (newValue !== undefined) {
          dispatch('didChangeModelContent', { e, value: newValue });
        }
      });

      // So.. there is no way to check when the model is initialized apparently!
      // https://github.com/microsoft/monaco-editor/issues/115

      // If we accidentally call the `getTypeScriptWorker()` function to early, it throws.
      // Just use retry with exponential back-off to get it!
      promiseRetry(
        async () => {
          let tsWorker: TypeScriptWorker | null = null;

          // Errors in this block indicate failure to find a loaded worker
          // so transform to the specific error type we care about.
          try {
            const getWorker: ((...uris: Uri[]) => Promise<TypeScriptWorker>) | undefined =
              await monaco?.languages.typescript.getTypeScriptWorker();
            if (getWorker) {
              tsWorker = await getWorker();
            }
          } catch (e) {
            throw new ShouldRetryError();
          }

          // Errors in the dispatch won't trigger the retry and will just fail.
          model = editor?.getModel(); // Set here so parents can bind to the model easily.
          if (model != null && tsWorker !== null) {
            dispatch('fullyLoaded', { model, worker: tsWorker });
          }
        },
        5,
        10,
      );
    }
  });

  onDestroy(() => {
    if (editor) {
      editor.dispose();
    }
    if (codeActionProvider) {
      codeActionProvider.dispose();
    }
    if (editor_load_event) {
      editor_load_event.dispose();
    }
  });
</script>

{#if !editor}
  <slot name="loading">
    <div style:padding="0.5rem">Loading Editor...</div>
  </slot>
{/if}

<div bind:this={div} class="monaco-editor {className}" style={styleName} />

<style>
  .monaco-editor {
    height: 100%;
  }
</style>
