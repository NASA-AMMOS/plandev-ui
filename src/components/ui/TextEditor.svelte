<svelte:options immutable={true} />

<script lang="ts">
  import { standardKeymap } from '@codemirror/commands';
  import { json, jsonParseLinter } from '@codemirror/lang-json';
  import { linter, lintGutter } from '@codemirror/lint';
  import { Compartment, EditorState } from '@codemirror/state';
  import { type ViewUpdate, keymap } from '@codemirror/view';
  import { basicSetup, EditorView } from 'codemirror';
  import { debounce } from 'lodash-es';
  import { File } from 'lucide-svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { ActionDefinition } from '../../types/actions';
  import { blockTheme } from '../../utilities/codemirror/themes/block';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import EditorToolbar from '../sequencing/EditorToolbar.svelte';
  import Panel from './Panel.svelte';
  import SectionTitle from './SectionTitle.svelte';

  export let availableActions: { action: ActionDefinition; parameter: string }[] = [];
  export let includeActions: boolean = false;
  export let isJSON: boolean = false;
  export let isLoading: boolean = false;
  export let previewOnly: boolean = false;
  export let readOnly: boolean = false;
  export let textFileContent: string = '';
  export let textFilePath: string = '';
  export let textFileName: string = '';

  const dispatch = createEventDispatcher<{
    download: { filePath: string };
    runAction: { action: ActionDefinition; parameter: string };
    save: string;
    textContentUpdated: { filePath: string; input: string };
  }>();
  const jsonLinter = linter(jsonParseLinter());

  let compartmentReadonly: Compartment;
  let disableCopyAndExport: boolean = true;
  let editorDiv: HTMLDivElement;
  let editorView: EditorView;
  let updatedTextContent: string = textFileContent;
  let isTextContentUpdated: boolean = false;
  let previousIsJSON: boolean = isJSON;
  let previousTextFilePath: string = textFilePath;

  // Create debounced listener at component level so we can cancel it when file changes
  const debouncedTextContentUpdateListener = debounce(textContentUpdateListener, 250);

  // Insert text content - use textFilePath as dependency to ensure editor updates when switching files
  // This handles the case where both old and new files have the same content (e.g., both empty)
  $: if (editorView) {
    void textFilePath;
    editorView.dispatch({
      changes: { from: 0, insert: textFileContent, to: editorView.state.doc.length },
    });
  }
  $: editorView?.dispatch({
    effects: compartmentReadonly.reconfigure([EditorState.readOnly.of(readOnly || previewOnly || isLoading)]),
  });
  $: updatedTextContent = textFileContent;
  $: isTextContentUpdated = updatedTextContent !== textFileContent;

  // Cancel pending debounced events when file path changes to prevent stale events
  // from being dispatched with the wrong file path
  $: if (textFilePath !== previousTextFilePath) {
    debouncedTextContentUpdateListener.cancel();
    previousTextFilePath = textFilePath;
  }

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
          EditorView.updateListener.of(debouncedTextContentUpdateListener),
          compartmentReadonly.of([EditorState.readOnly.of(readOnly || previewOnly || isLoading)]),
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
          EditorView.updateListener.of(debouncedTextContentUpdateListener),
          compartmentReadonly.of([EditorState.readOnly.of(readOnly || previewOnly || isLoading)]),
        ],
        parent: editorDiv,
      });
    }
  }

  async function textContentUpdateListener(viewUpdate: ViewUpdate): Promise<void> {
    const updatedText = viewUpdate.state.doc.toString();
    disableCopyAndExport = updatedText === '';

    updatedTextContent = updatedText;
    dispatch('textContentUpdated', { filePath: textFilePath, input: updatedText });
  }

  function downloadInputFormat(): void {
    dispatch('download', { filePath: textFilePath });
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

  function onRunAction(action: ActionDefinition, parameter: string) {
    dispatch('runAction', { action, parameter });
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
        EditorView.updateListener.of(debouncedTextContentUpdateListener),
        blockTheme,
        compartmentReadonly.of([EditorState.readOnly.of(readOnly || previewOnly || isLoading)]),
      ],
      parent: editorDiv,
    });
  });
</script>

<Panel>
  <svelte:fragment slot="header">
    <SectionTitle alt={textFilePath}>
      <File size={16} slot="icon" />
      {textFileName || 'Untitled'}{readOnly ? ' (Read-only)' : ''}{previewOnly && !isLoading ? ' (Preview-only)' : ''}
    </SectionTitle>

    <EditorToolbar
      actions={availableActions}
      actionsDisabled={textFileName === '' || availableActions.length === 0}
      showActions={includeActions}
      showCopyButton
      copyDisabled={disableCopyAndExport}
      onCopy={copyInputFormatToClipboard}
      showDownloadButton
      downloadDisabled={disableCopyAndExport}
      onDownload={downloadInputFormat}
      showSaveButton={!(readOnly || previewOnly || isLoading)}
      saveDisabled={!isTextContentUpdated}
      saveHighlighted={isTextContentUpdated}
      {onSave}
      on:runAction={e => onRunAction(e.detail.action, e.detail.parameter)}
    />
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
