<svelte:options immutable={true} />

<script lang="ts">
  import { standardKeymap } from '@codemirror/commands';
  import { json, jsonParseLinter } from '@codemirror/lang-json';
  import { linter, lintGutter } from '@codemirror/lint';
  import { Compartment, EditorState, Transaction } from '@codemirror/state';
  import { type ViewUpdate, keymap } from '@codemirror/view';
  import { basicSetup, EditorView } from 'codemirror';
  import { debounce } from 'lodash-es';
  import { File } from 'lucide-svelte';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import type { ActionDefinition } from '../../types/actions';
  import type { LintDiagnostic } from '../../types/errors';
  import type { WorkspaceFileMetadata } from '../../types/workspace-tree-view';
  import { getLintDiagnostics } from '../../utilities/codemirror/lint';
  import { readOnlyChangeGuard } from '../../utilities/codemirror/readOnly';
  import { blockTheme } from '../../utilities/codemirror/themes/block';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import EditorToolbar from '../sequencing/EditorToolbar.svelte';
  import FileMetadataBanner from '../workspace/FileMetadataBanner.svelte';
  import Panel from './Panel.svelte';
  import SectionTitle from './SectionTitle.svelte';

  export let availableActions: { action: ActionDefinition; parameter: string }[] = [];
  export let fileMetadata: WorkspaceFileMetadata | null = null;
  export let includeActions: boolean = false;
  export let isJSON: boolean = false;
  export let isLoading: boolean = false;
  export let previewOnly: boolean = false;
  export let readOnly: boolean = false;
  export let shouldListenForKeyboardSave: boolean = true;
  export let textFileContent: string = '';
  export let textFilePath: string = '';
  export let textFileName: string = '';
  export let onReadOnlyChange: ((readOnly: boolean) => void) | null = null;

  const dispatch = createEventDispatcher<{
    download: { filePath: string };
    lintChange: { diagnostics: LintDiagnostic[]; filePath: string };
    runAction: { action: ActionDefinition; parameter: string };
    save: string;
    textContentUpdated: { filePath: string; input: string };
  }>();
  const jsonLinter = linter(jsonParseLinter());

  let compartmentReadonly: Compartment;
  let disableCopyAndExport: boolean = true;
  let editorDiv: HTMLDivElement;
  let editorView: EditorView;
  let isTextContentUpdated: boolean = false;
  let previousIsJSON: boolean | null = null;
  let previousTextFilePath: string = textFilePath;
  let updatedTextContent: string = textFileContent;

  // Insert text content - use textFilePath as dependency to ensure editor updates when switching files
  // This handles the case where both old and new files have the same content (e.g., both empty)
  $: if (editorView) {
    void textFilePath;
    // Skip the dispatch if the editor already has the correct content (e.g., after save),
    // to avoid resetting the cursor position.
    if (editorView.state.doc.toString() !== textFileContent) {
      editorView.dispatch({
        annotations: [Transaction.addToHistory.of(false)], // Prevent this change from being added to the undo history
        changes: { from: 0, insert: textFileContent, to: editorView.state.doc.length },
        // Tagged so the read-only change guard lets this content sync through.
        userEvent: 'file.open',
      });
    }
  }
  $: {
    const isEditable = !(readOnly || previewOnly || isLoading);
    editorView?.dispatch({
      effects: compartmentReadonly.reconfigure([
        EditorState.readOnly.of(!isEditable),
        EditorView.editable.of(isEditable),
        // Block programmatic edits readOnly misses (e.g. lint fixes), but allow 'file.open' sync.
        ...(isEditable ? [] : [readOnlyChangeGuard(['file.open'])]),
      ]),
    });
  }
  $: updatedTextContent = textFileContent;
  $: isTextContentUpdated = updatedTextContent !== textFileContent;

  // Cancel pending debounced events when file path changes to prevent stale events
  // from being dispatched with the wrong file path
  $: if (textFilePath !== previousTextFilePath) {
    dispatchLintChange.cancel();
    previousTextFilePath = textFilePath;
  }

  $: if (previousIsJSON !== isJSON && editorDiv) {
    previousIsJSON = isJSON;

    if (editorView) {
      editorView.destroy();
    }
    if (isJSON) {
      editorView = new EditorView({
        extensions: [
          basicSetup,
          keymap.of([
            ...standardKeymap,
            shouldListenForKeyboardSave ? { key: 'Ctrl-s', mac: 'Cmd-s', run: onSave } : {},
          ]),
          EditorView.lineWrapping,
          EditorView.theme({ '.cm-gutter': { 'min-height': '0px' } }),
          lintGutter(),
          json(),
          EditorView.updateListener.of(viewUpdate => dispatchLintChange(viewUpdate.view)),
          jsonLinter,
          EditorView.updateListener.of(viewUpdate => {
            if (viewUpdate.docChanged) {
              textContentUpdateListener(viewUpdate);
            }
          }),
          compartmentReadonly.of(
            readOnly || previewOnly || isLoading
              ? [EditorState.readOnly.of(true), readOnlyChangeGuard(['file.open'])]
              : [EditorState.readOnly.of(false)],
          ),
        ],
        parent: editorDiv,
      });
    } else {
      editorView = new EditorView({
        extensions: [
          basicSetup,
          keymap.of([
            ...standardKeymap,
            shouldListenForKeyboardSave ? { key: 'Ctrl-s', mac: 'Cmd-s', run: onSave } : {},
          ]),
          EditorView.lineWrapping,
          EditorView.theme({ '.cm-gutter': { 'min-height': '0px' } }),
          lintGutter(),
          EditorView.updateListener.of(viewUpdate => dispatchLintChange(viewUpdate.view)),
          EditorView.updateListener.of(viewUpdate => {
            if (viewUpdate.docChanged) {
              textContentUpdateListener(viewUpdate);
            }
          }),
          compartmentReadonly.of(
            readOnly || previewOnly || isLoading
              ? [EditorState.readOnly.of(true), readOnlyChangeGuard(['file.open'])]
              : [EditorState.readOnly.of(false)],
          ),
        ],
        parent: editorDiv,
      });
    }
  }

  const dispatchLintChange = debounce((view: EditorView) => {
    if (textFilePath) {
      dispatch('lintChange', {
        diagnostics: getLintDiagnostics(view),
        filePath: textFilePath,
      });
    }
  }, 300);

  function textContentUpdateListener(viewUpdate: ViewUpdate): void {
    const updatedText = viewUpdate.state.doc.toString();
    disableCopyAndExport = updatedText === '';
    updatedTextContent = updatedText;
    dispatch('textContentUpdated', { filePath: textFilePath, input: updatedText });
  }

  /**
   * Replace the editor content and DO record it in the undo history — unlike the file-open sync,
   * which is excluded from history. Used by "take theirs" so the user can Cmd-Z back to the edits
   * they discarded (the full-doc replace and its inverse are exact, so undo/redo stay clean).
   */
  export function rebaseContent(content: string): void {
    if (editorView && editorView.state.doc.toString() !== content) {
      editorView.dispatch({
        changes: { from: 0, insert: content, to: editorView.state.doc.length },
        userEvent: 'file.rebase',
      });
    }
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
    const currentText = editorView.state.doc.toString();
    if (currentText !== textFileContent) {
      updatedTextContent = currentText;
      dispatch('save', currentText);
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
        keymap.of([...standardKeymap, shouldListenForKeyboardSave ? { key: 'Ctrl-s', mac: 'Cmd-s', run: onSave } : {}]),
        EditorView.lineWrapping,
        EditorView.theme({ '.cm-gutter': { 'min-height': '0px' } }),
        lintGutter(),
        EditorView.updateListener.of(viewUpdate => dispatchLintChange(viewUpdate.view)),
        EditorView.updateListener.of(viewUpdate => {
          if (viewUpdate.docChanged) {
            textContentUpdateListener(viewUpdate);
          }
        }),
        blockTheme,
        compartmentReadonly.of([EditorState.readOnly.of(readOnly || previewOnly || isLoading)]),
      ],
      parent: editorDiv,
    });
  });

  onDestroy(() => {
    dispatchLintChange.cancel();
    editorView?.destroy();
  });
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <SectionTitle alt={textFilePath}>
      <File size={16} slot="icon" />
      {textFileName || 'Untitled'}{readOnly || (previewOnly && !isLoading) ? ' (Read only)' : ''}
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
    {#if fileMetadata}
      <FileMetadataBanner {fileMetadata} hasEditPermission={!previewOnly} {onReadOnlyChange} />
    {/if}
    <div class="p-2" bind:this={editorDiv} />
  </svelte:fragment>
</Panel>
