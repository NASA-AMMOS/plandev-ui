<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import type { editor as Editor } from 'monaco-editor/esm/vs/editor/editor.api';
  import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
  import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
  import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

  export let automaticLayout: boolean | undefined = undefined;
  export let language: string | undefined = undefined;
  export let lineNumbers: Editor.LineNumbersType | undefined = undefined;
  export let minimap: Editor.IEditorMinimapOptions | undefined = undefined;
  export let model: Editor.ITextModel | null | undefined = undefined;
  export let override: Editor.IEditorOverrideServices | undefined = undefined;
  export let scrollBeyondLastLine: boolean | undefined = undefined;
  export let theme: string | undefined = undefined;
  export let value: string | undefined = undefined;

  const dispatch = createEventDispatcher();

  let div: HTMLDivElement | undefined = undefined;
  let editor: Editor.IStandaloneCodeEditor | undefined = undefined;

  $: if (editor) {
    const currentValue = editor.getValue();
    if (value !== currentValue) {
      const scrollTop = editor.getScrollTop(); // setValue can nuke scroll position.
      editor.getModel().setValue(value);
      editor.setScrollPosition({ scrollTop });
    }
  }

  onMount(async () => {
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

    const options: Editor.IStandaloneEditorConstructionOptions = {
      automaticLayout,
      language,
      lineNumbers,
      minimap,
      model,
      scrollBeyondLastLine,
      theme,
      value,
    };
    const monaco = await import('monaco-editor');
    editor = monaco.editor.create(div, options, override);

    editor.onDidChangeModelContent((e: Editor.IModelContentChangedEvent) => {
      const newValue = editor.getModel().getValue();
      dispatch('didChangeModelContent', { e, value: newValue });
    });
  });

  onDestroy(() => {
    if (editor) {
      editor.dispose();
    }
  });
</script>

{#if !editor}
  <slot name="loading">Loading Editor...</slot>
{/if}

<div bind:this={div} class="monaco-editor" />

<style>
  .monaco-editor {
    height: 100%;
  }
</style>
