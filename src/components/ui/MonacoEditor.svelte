<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import type { editor as Editor, IDisposable, Uri, languages } from 'monaco-editor/esm/vs/editor/editor.api';
  import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
  import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import type { Monaco } from '../../types/monaco';
  import { ShouldRetryError, promiseRetry } from '../../utilities/generic';

  export { className as class };
  export { styleName as style };
  export let automaticLayout: boolean | undefined = undefined;
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
  export let value: string | undefined = undefined;

  type TypeScriptWorker = languages.typescript.TypeScriptWorker;

  const dispatch = createEventDispatcher<{
    didChangeModelContent: { e: Editor.IModelContentChangedEvent; value: string };
    fullyLoaded: { model: Editor.ITextModel; worker: TypeScriptWorker };
  }>();

  let className: string = '';
  let div: HTMLDivElement | undefined = undefined;
  let editor: Editor.IStandaloneCodeEditor | undefined = undefined;
  let editor_load_event: IDisposable | undefined = undefined;
  let styleName: string = '';

  $: if (editor) {
    const currentValue = editor.getValue();
    if (value !== currentValue) {
      const scrollTop = editor.getScrollTop(); // setValue can nuke scroll position.
      editor.getModel().setValue(value ?? ''); // Make sure value is not null or Monaco throws.
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
          return new Worker(new URL('ts.worker.js', location.origin), { type: 'classic' });
        }
        return new editorWorker();
      },
    };

    const options: Editor.IStandaloneEditorConstructionOptions = {
      automaticLayout,
      fixedOverflowWidgets,
      language,
      lineNumbers,
      minimap,
      model,
      readOnly,
      scrollBeyondLastLine,
      tabSize,
      theme,
      value,
    };
    monaco = await import('monaco-editor');
    monaco.languages.typescript.typescriptDefaults.setWorkerOptions({
      customWorkerPath: '/customTS.worker.js',
    });
    editor = monaco.editor.create(div, options, override);

    editor.onDidChangeModelContent((e: Editor.IModelContentChangedEvent) => {
      const newValue = editor.getModel().getValue();
      dispatch('didChangeModelContent', { e, value: newValue });
    });

    // So.. there is no way to check when the model is initialized apparently!
    // https://github.com/microsoft/monaco-editor/issues/115

    // If we accidentally call the `getTypeScriptWorker()` function to early, it throws.
    //  Just use retry with exponential back-off to get it!
    promiseRetry(
      async () => {
        let getWorker: (...uris: Uri[]) => Promise<TypeScriptWorker>;
        let tsWorker: TypeScriptWorker;
        // Errors in this block indicate failure to find a loaded worker
        //  so transform to the specific error type we care about
        try {
          getWorker = await monaco.languages.typescript.getTypeScriptWorker();
          tsWorker = await getWorker();
        } catch (e) {
          throw new ShouldRetryError();
        }

        // Errors in the dispatch won't trigger the retry and will just fail.
        dispatch('fullyLoaded', { model: editor.getModel(), worker: tsWorker });
      },
      5,
      10,
    );
  });

  onDestroy(() => {
    if (editor) {
      editor.dispose();
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
