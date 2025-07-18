<svelte:options immutable={true} />

<script lang="ts">
  import { standardKeymap } from '@codemirror/commands';
  import { json, jsonParseLinter } from '@codemirror/lang-json';
  import { linter, lintGutter } from '@codemirror/lint';
  import { Compartment, EditorState } from '@codemirror/state';
  import { type ViewUpdate, keymap } from '@codemirror/view';
  import ClipboardIcon from 'bootstrap-icons/icons/clipboard.svg?component';
  import DownloadIcon from 'bootstrap-icons/icons/download.svg?component';
  import { basicSetup, EditorView } from 'codemirror';
  import { debounce } from 'lodash-es';
  import { createEventDispatcher, onMount } from 'svelte';
  import { blockTheme } from '../../utilities/codemirror/themes/block';
  import { downloadBlob } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import { tooltip } from '../../utilities/tooltip';
  import Panel from './Panel.svelte';
  import SectionTitle from './SectionTitle.svelte';

  export let isJSON: boolean = false;
  export let previewOnly: boolean = false;
  export let readOnly: boolean = false;
  export let textFileContent: string = '';
  export let textFileName: string = '';
  export let title: string = 'Text Editor';

  const dispatch = createEventDispatcher<{
    save: string;
    textContentUpdated: { input: string };
  }>();
  const jsonLinter = linter(jsonParseLinter());

  let compartmentReadonly: Compartment;
  let disableCopyAndExport: boolean = true;
  let editorDiv: HTMLDivElement;
  let editorView: EditorView;
  let updatedTextContent: string = textFileContent;
  let isTextContentUpdated: boolean = false;
  let previousIsJSON: boolean = isJSON;

  $: if (editorView) {
    editorView.dispatch({
      changes: { from: 0, insert: textFileContent, to: editorView.state.doc.length },
    });
  }
  $: editorView?.dispatch({
    effects: compartmentReadonly.reconfigure([EditorState.readOnly.of(readOnly || previewOnly)]),
  });
  $: updatedTextContent = textFileContent;
  $: isTextContentUpdated = updatedTextContent !== textFileContent;
  $: if (previousIsJSON !== isJSON && editorDiv) {
    if (editorView) {
      editorView.destroy();
    }
    if (isJSON) {
      editorView = new EditorView({
        doc: textFileContent,
        extensions: [
          basicSetup,
          keymap.of([...standardKeymap, { key: 'Ctrl-s', mac: 'Cmd-s', run: onSave }]),
          EditorView.lineWrapping,
          EditorView.theme({ '.cm-gutter': { 'min-height': '0px' } }),
          lintGutter(),
          json(),
          jsonLinter,
          EditorView.updateListener.of(debounce(textContentUpdateListener, 250)),
          compartmentReadonly.of([EditorState.readOnly.of(readOnly || previewOnly)]),
        ],
        parent: editorDiv,
      });
    } else {
      editorView = new EditorView({
        doc: textFileContent,
        extensions: [
          basicSetup,
          keymap.of([...standardKeymap, { key: 'Ctrl-s', mac: 'Cmd-s', run: onSave }]),
          EditorView.lineWrapping,
          EditorView.theme({ '.cm-gutter': { 'min-height': '0px' } }),
          lintGutter(),
          EditorView.updateListener.of(debounce(textContentUpdateListener, 250)),
          compartmentReadonly.of([EditorState.readOnly.of(readOnly || previewOnly)]),
        ],
        parent: editorDiv,
      });
    }
  }

  async function textContentUpdateListener(viewUpdate: ViewUpdate): Promise<void> {
    const updatedText = viewUpdate.state.doc.toString();
    disableCopyAndExport = updatedText === '';

    updatedTextContent = updatedText;
    dispatch('textContentUpdated', { input: updatedText });
  }

  function downloadInputFormat(): void {
    downloadBlob(new Blob([editorView.state.doc.toString()], { type: 'text/plain' }), `${textFileName}`);
  }

  async function copyInputFormatToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(editorView.state.doc.toString());
      showSuccessToast(`Text copied to clipboard`);
    } catch {
      showFailureToast(`Error copying text to clipboard`);
    }
  }

  function onSave(): boolean {
    if (isTextContentUpdated) {
      dispatch('save', updatedTextContent);
    }
    return true;
  }

  onMount(() => {
    compartmentReadonly = new Compartment();

    editorView = new EditorView({
      doc: textFileContent,
      extensions: [
        basicSetup,
        keymap.of([...standardKeymap, { key: 'Ctrl-s', mac: 'Cmd-s', run: onSave }]),
        EditorView.lineWrapping,
        EditorView.theme({ '.cm-gutter': { 'min-height': '0px' } }),
        lintGutter(),
        EditorView.updateListener.of(debounce(textContentUpdateListener, 250)),
        blockTheme,
        compartmentReadonly.of([EditorState.readOnly.of(readOnly || previewOnly)]),
      ],
      parent: editorDiv,
    });
  });
</script>

<Panel>
  <svelte:fragment slot="header">
    <SectionTitle>{title}</SectionTitle>

    <div class="right">
      <button
        use:tooltip={{ content: `Copy sequence contents`, placement: 'top' }}
        class="st-button icon-button secondary"
        on:click={copyInputFormatToClipboard}
        disabled={disableCopyAndExport}
      >
        <ClipboardIcon />
        Copy
      </button>
      <button
        use:tooltip={{
          content: `Download sequence contents`,
          placement: 'top',
        }}
        class="st-button icon-button secondary"
        on:click|stopPropagation={downloadInputFormat}
        disabled={disableCopyAndExport}
      >
        <DownloadIcon />
        Download
      </button>
      {#if !readOnly}
        <button
          class="st-button icon-button"
          class:secondary={!isTextContentUpdated}
          disabled={!isTextContentUpdated}
          on:click={onSave}
        >
          Save
        </button>
      {/if}
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <div
      bind:this={editorDiv}
      use:permissionHandler={{
        hasPermission: !readOnly,
        permissionError: 'This sequence has been marked as readonly.',
      }}
    />
  </svelte:fragment>
</Panel>

<style>
  .right {
    align-items: center;
    display: flex;
    justify-content: space-around;
  }

  .icon-button {
    align-items: center;
    column-gap: 5px;
    display: flex;
    margin: 2px;
  }
</style>
