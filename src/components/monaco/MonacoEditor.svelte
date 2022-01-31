<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import type { editor as Editor } from 'monaco-editor/esm/vs/editor/editor.api';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { createMonacoEditor } from './monaco';

  const dispatch = createEventDispatcher();

  export let automaticLayout: boolean = true;
  export let language: string = '';
  export let lineNumbers: Editor.LineNumbersType = 'on';
  export let minimap: Editor.IEditorMinimapOptions = { enabled: false };
  export let overrideServices: Editor.IEditorOverrideServices = undefined;
  export let scrollBeyondLastLine: boolean = false;
  export let value: string = '';

  let div: HTMLDivElement | null = null;
  let editor: Editor.IStandaloneCodeEditor;

  $: if (editor) {
    const currentValue = editor.getValue();
    if (value !== currentValue) {
      const scrollTop = editor.getScrollTop(); // setValue can nuke scroll position.
      editor.getModel().setValue(value);
      editor.setScrollPosition({ scrollTop });
    }
  }

  onMount(async () => {
    const options: Editor.IStandaloneEditorConstructionOptions = {
      automaticLayout,
      language,
      lineNumbers,
      minimap,
      scrollBeyondLastLine,
      value,
    };

    editor = await createMonacoEditor(div, options, overrideServices);

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
