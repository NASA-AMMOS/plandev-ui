<script lang="ts">
  import type { ViewUpdate } from '@codemirror/view';
  import { basicSetup, EditorView, EditorState } from '@codemirror/basic-setup';
  import { json } from '@codemirror/lang-json';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';

  const dispatch = createEventDispatcher();

  export let text: string = '';

  let div: HTMLDivElement;
  let editorView: EditorView;

  $: if (editorView) {
    const { state } = editorView;
    const currentText = state.doc.toJSON().join(state.lineBreak);
    if (currentText !== text) {
      const update = state.update({
        changes: {
          from: 0,
          insert: text,
          to: state.doc.length,
        },
        selection: state.selection,
      });
      editorView.update([update]);
    }
  }

  onMount(() => {
    const updateListener = EditorView.updateListener.of(updateListenerCallback);
    const theme = EditorView.theme({
      '&.cm-editor': { height: '100%' },
      '&.cm-focused': { outline: '0px' },
    });

    editorView = new EditorView({
      parent: div,
      state: EditorState.create({
        doc: text,
        extensions: [basicSetup, updateListener, json(), theme],
      }),
    });
  });

  onDestroy(() => {
    if (editorView) {
      editorView.destroy();
    }
  });

  function updateListenerCallback(update: ViewUpdate) {
    if (update.docChanged) {
      const newText = editorView.state.doc
        .toJSON()
        .join(editorView.state.lineBreak);
      dispatch('textChanged', newText);
    }
  }
</script>

<div class="h-100 w-100" bind:this={div} />
