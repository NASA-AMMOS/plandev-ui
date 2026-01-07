<svelte:options immutable={true} />

<script lang="ts">
  import { standardKeymap } from '@codemirror/commands';
  import { syntaxTree } from '@codemirror/language';
  import { lintGutter, openLintPanel } from '@codemirror/lint';
  import { Compartment, EditorState, type Extension } from '@codemirror/state';
  import { keymap, type ViewUpdate } from '@codemirror/view';
  import type { SyntaxNode } from '@lezer/common';
  import type {
    CommandInfoMapper,
    OutputLanguage,
    PhoenixAdaptation,
    PhoenixContext,
  } from '@nasa-jpl/aerie-sequence-languages';
  import { Button, Label } from '@nasa-jpl/stellar-svelte';
  import { basicSetup, EditorView } from 'codemirror';
  import { debounce } from 'lodash-es';
  import { FileBracesCorner, PanelBottomClose, PanelBottomOpen } from 'lucide-svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { ActionDefinition } from '../../types/actions';
  import { blockTheme } from '../../utilities/codemirror/themes/block';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { phoenixResources } from '../../utilities/sequence-editor/adaptation-resources';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import Tooltip from '../ui/Tooltip.svelte';
  import CommandPanel from './CommandPanel/CommandPanel.svelte';
  import EditorToolbar from './EditorToolbar.svelte';

  export let availableActions: { action: ActionDefinition; parameter: string }[] = [];
  export let phoenixContext: PhoenixContext;
  export let includeActions: boolean = false;
  export let isLoading: boolean = false;
  export let previewOnly: boolean = false;
  export let readOnly: boolean = false;
  export let sequenceAdaptation: PhoenixAdaptation;
  export let sequenceName: string = '';
  export let sequenceFilePath: string = '';
  export let sequenceDefinition: string = '';
  export let sequenceOutput: string = '';
  export let showCommandFormBuilder: boolean = false;
  export let userSequenceEditorColumns: string;
  export let userSequenceEditorColumnsWithFormBuilder: string;

  const dispatch = createEventDispatcher<{
    downloadInput: { filePath: string };
    downloadOutput: { content: string; filePath: string; filename: string; outputLanguage: OutputLanguage };
    runAction: { action: ActionDefinition; parameter: string };
    save: string;
    sequence: { filePath: string; input: string; output?: string };
  }>();

  let compartmentAdaptation: Compartment;
  let compartmentOutputAdaptation: Compartment;
  let compartmentReadonly: Compartment;
  let disableCopyAndExport: boolean = true;
  let editorHeights: string = '1.88fr 3px 80px';
  let editorOutputDiv: HTMLDivElement;
  let editorOutputView: EditorView;
  let editorSequenceDiv: HTMLDivElement;
  let editorSequenceView: EditorView;
  let selectedNode: SyntaxNode | null;
  let selectedOutputFormat: OutputLanguage | undefined;
  let showOutputs: boolean = true;
  let previousShowOutputs: boolean = showOutputs;
  let toggleSeqJsonPreview: boolean = false;
  let updatedSequenceDefinition: string = sequenceDefinition;
  let isSequenceDefinitionUpdated: boolean = false;
  let commandInfoMapper: CommandInfoMapper;
  let inputEditorExtension: Extension = [];
  let outputEditorExtension: Extension = [];
  let previousSequenceFilePath: string = sequenceFilePath;

  // Create debounced listener at component level so we can cancel it when file changes
  const debouncedSequenceUpdateListener = debounce(sequenceUpdateListener, 250);

  $: commandInfoMapper = sequenceAdaptation.input.commandInfoMapper;

  $: if (phoenixContext && sequenceAdaptation.input.getEditorExtension) {
    inputEditorExtension = sequenceAdaptation.input.getEditorExtension(phoenixContext, phoenixResources);
  }

  $: if (phoenixContext && selectedOutputFormat?.getEditorExtension) {
    outputEditorExtension = selectedOutputFormat.getEditorExtension(phoenixContext, phoenixResources);
  }

  // insert sequence - use sequenceFilePath as dependency to ensure editor updates when switching files
  // This handles the case where both old and new files have the same content (e.g., both empty)
  $: {
    // note: this statement always runs when sequenceFilePath changes, regardless of value
    // as opposed to the more common $: if (typeof sequenceFilePath === 'string') which will only
    // trigger reactivity if sequenceFilePath is a string and not if it is null / undefined.
    // In this case, we want to trigger reactivity on all possible values.
    void sequenceFilePath;
    editorSequenceView?.dispatch({
      changes: { from: 0, insert: sequenceDefinition, to: editorSequenceView.state.doc.length },
    });
  }

  $: commandFormBuilderGrid = showCommandFormBuilder
    ? userSequenceEditorColumnsWithFormBuilder
    : userSequenceEditorColumns;

  $: {
    // Configure sequence editor.
    if (editorSequenceView) {
      editorSequenceView.dispatch({
        effects: [compartmentAdaptation.reconfigure(inputEditorExtension)],
      });
    }
  }

  $: editorSequenceView?.dispatch({
    effects: compartmentReadonly.reconfigure([EditorState.readOnly.of(readOnly || previewOnly || isLoading)]),
  });

  $: {
    previousShowOutputs = showOutputs;
    showOutputs = sequenceAdaptation.outputs.length > 0;
  }
  $: if (showOutputs) {
    editorHeights = toggleSeqJsonPreview ? '1fr 3px 1fr' : '1.88fr 3px 80px';
  } else {
    editorHeights = '1fr 3px';
  }

  $: if (sequenceAdaptation.outputs.length > 0) {
    selectedOutputFormat = sequenceAdaptation.outputs[0];
  }

  $: if (showOutputs && previousShowOutputs !== showOutputs && editorOutputDiv) {
    if (editorOutputView) {
      editorOutputView.destroy();
    }
    editorOutputView = new EditorView({
      doc: sequenceOutput,
      extensions: [
        basicSetup,
        keymap.of([...standardKeymap, { key: 'Ctrl-s', mac: 'Cmd-s', run: onSave }]),
        EditorView.lineWrapping,
        EditorView.theme({ '.cm-gutter': { 'min-height': '0px' } }),
        EditorView.editable.of(false),
        lintGutter(),
        compartmentOutputAdaptation.of(outputEditorExtension),
        EditorState.readOnly.of(readOnly),
      ],
      parent: editorOutputDiv,
    });
  }

  $: updatedSequenceDefinition = sequenceDefinition;
  $: isSequenceDefinitionUpdated = updatedSequenceDefinition !== sequenceDefinition;

  // Cancel pending debounced events when file path changes to prevent stale events
  // from being dispatched with the wrong file path
  $: if (sequenceFilePath !== previousSequenceFilePath) {
    debouncedSequenceUpdateListener.cancel();
    previousSequenceFilePath = sequenceFilePath;
  }

  async function sequenceUpdateListener(viewUpdate: ViewUpdate): Promise<void> {
    const sequence = viewUpdate.state.doc.toString();
    disableCopyAndExport = sequence === '';
    let output =
      sequenceName === undefined
        ? undefined
        : selectedOutputFormat?.toOutputFormat?.(sequence, phoenixContext, sequenceName);

    editorOutputView.dispatch({ changes: { from: 0, insert: output ?? '', to: editorOutputView.state.doc.length } });

    updatedSequenceDefinition = sequence;
    if (output !== undefined) {
      dispatch('sequence', { filePath: sequenceFilePath, input: sequence, output });
    }
  }

  function selectedCommandUpdateListener(viewUpdate: ViewUpdate): void {
    // This is broken out into a different listener as debouncing this can cause cursor to move around
    const tree = syntaxTree(viewUpdate.state);
    // Command Node includes trailing newline and white space, move to next command
    const selectionLine = viewUpdate.state.doc.lineAt(viewUpdate.state.selection.asSingle().main.from);
    const leadingWhiteSpaceLength = selectionLine.text.length - selectionLine.text.trimStart().length;
    const updatedSelectionNode = tree.resolveInner(selectionLine.from + leadingWhiteSpaceLength, 1);
    // minimize triggering selected command view
    if (selectedNode !== updatedSelectionNode) {
      selectedNode = updatedSelectionNode;
    }
  }

  function downloadOutputFormat(outputLanguage: OutputLanguage): void {
    const content = editorOutputView.state.doc.toString();
    // Remove any existing extension and add output extension
    const outputExt = outputLanguage.fileExtension; // Keep the dot
    const lastDotIndex = sequenceName.lastIndexOf('.');

    // If there's a dot in the filename, remove everything after it; otherwise keep the whole name
    const filenameWithoutExt = lastDotIndex > 0 ? sequenceName.slice(0, lastDotIndex) : sequenceName;
    const filename = filenameWithoutExt + outputExt;

    dispatch('downloadOutput', { content, filePath: sequenceFilePath, filename, outputLanguage });
  }

  function downloadInputFormat(): void {
    dispatch('downloadInput', { filePath: sequenceFilePath });
  }

  async function copyOutputFormatToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(editorOutputView.state.doc.toString());
      showSuccessToast(`${selectedOutputFormat?.name} copied to clipboard`);
    } catch {
      showFailureToast(`Error copying ${selectedOutputFormat?.name} to clipboard`);
    }
  }

  async function copyInputFormatToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(editorSequenceView.state.doc.toString());
      showSuccessToast(`${sequenceAdaptation.input.name} copied to clipboard`);
    } catch {
      showFailureToast(`Error copying ${sequenceAdaptation.input.name} to clipboard`);
    }
  }

  function toggleSeqJsonEditor(): void {
    toggleSeqJsonPreview = !toggleSeqJsonPreview;
  }

  function showErrorPanel() {
    openLintPanel(editorSequenceView);
  }

  function formatDocument() {
    let format = sequenceAdaptation.input.format;
    if (format !== undefined) {
      format(editorSequenceView, phoenixContext);
    }
  }

  function onRunAction(event: CustomEvent<{ action: ActionDefinition; parameter: string }>) {
    const { action, parameter } = event.detail;
    dispatch('runAction', { action, parameter });
  }

  function onSave(): boolean {
    if (isSequenceDefinitionUpdated) {
      dispatch('save', updatedSequenceDefinition);
    }
    return true;
  }

  onMount(() => {
    compartmentReadonly = new Compartment();
    compartmentAdaptation = new Compartment();
    compartmentOutputAdaptation = new Compartment();

    editorSequenceView = new EditorView({
      doc: sequenceDefinition,
      extensions: [
        basicSetup,
        keymap.of([...standardKeymap, { key: 'Ctrl-s', mac: 'Cmd-s', run: onSave }]),
        EditorView.lineWrapping,
        EditorView.theme({ '.cm-gutter': { 'min-height': '0px' } }),
        lintGutter(),
        EditorView.updateListener.of(debouncedSequenceUpdateListener),
        EditorView.updateListener.of(selectedCommandUpdateListener),
        blockTheme,
        compartmentAdaptation.of(inputEditorExtension),
        compartmentReadonly.of([EditorState.readOnly.of(readOnly || previewOnly || isLoading)]),
      ],
      parent: editorSequenceDiv,
    });

    editorOutputView = new EditorView({
      doc: sequenceOutput,
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        EditorView.theme({ '.cm-gutter': { 'min-height': '0px' } }),
        EditorView.editable.of(false),
        lintGutter(),
        compartmentOutputAdaptation.of(outputEditorExtension),
        EditorState.readOnly.of(readOnly),
      ],
      parent: editorOutputDiv,
    });
  });
</script>

<CssGrid class="z-0 w-full" bind:columns={commandFormBuilderGrid} minHeight={'0'} columnMinSizes={{ 0: 400, 2: 292 }}>
  <CssGrid rows={editorHeights} minHeight={'0'}>
    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle alt={sequenceFilePath} overflow="hidden">
          <FileBracesCorner size={16} slot="icon" />
          {sequenceName || 'Untitled'}{readOnly ? ' (Read-only)' : ''}{previewOnly && !isLoading
            ? ' (Preview-only)'
            : ''}
        </SectionTitle>

        <EditorToolbar
          actions={availableActions}
          actionsDisabled={sequenceName === '' || availableActions.length === 0}
          showActions={includeActions}
          showErrorPanelButton
          onShowErrorPanel={showErrorPanel}
          showFormatButton
          onFormat={formatDocument}
          showCopyButton
          copyDisabled={disableCopyAndExport}
          copyTooltip="Copy sequence contents"
          onCopy={copyInputFormatToClipboard}
          showDownloadButton
          downloadDisabled={disableCopyAndExport}
          downloadTooltip="Download sequence contents"
          onDownload={downloadInputFormat}
          outputFormats={showOutputs ? sequenceAdaptation.outputs : []}
          outputDisabled={disableCopyAndExport}
          onCopyOutput={copyOutputFormatToClipboard}
          onDownloadOutput={downloadOutputFormat}
          showSaveButton={!(readOnly || previewOnly || isLoading)}
          saveDisabled={!isSequenceDefinitionUpdated}
          saveHighlighted={isSequenceDefinitionUpdated}
          {onSave}
          on:runAction={onRunAction}
        />
      </svelte:fragment>

      <svelte:fragment slot="body">
        <div
          bind:this={editorSequenceDiv}
          use:permissionHandler={{
            hasPermission: !readOnly,
            permissionError: 'This sequence has been marked as readonly.',
          }}
        />
      </svelte:fragment>
    </Panel>

    {#if showOutputs}
      <CssGridGutter draggable={toggleSeqJsonPreview} track={1} type="row" />
      <Panel>
        <svelte:fragment slot="header">
          <SectionTitle>{selectedOutputFormat?.name} (Read-only)</SectionTitle>

          <div class="right">
            <div class="flex items-center gap-2">
              {#if sequenceAdaptation.outputs.length > 0}
                <Label size="sm" class="mr-1 whitespace-nowrap  text-muted-foreground" for="outputFormat">
                  Output Format
                </Label>
                <select bind:value={selectedOutputFormat} class="st-select w-full" name="outputFormat">
                  {#each sequenceAdaptation.outputs as outputFormatItem}
                    <option value={outputFormatItem}>
                      {outputFormatItem.name}
                    </option>
                  {/each}
                </select>
              {/if}

              <Tooltip content={toggleSeqJsonPreview ? `Collapse Editor` : `Expand Editor`}>
                <Button size="icon" variant="ghost" on:click={toggleSeqJsonEditor}>
                  {#if toggleSeqJsonPreview}
                    <PanelBottomClose size={16} />
                  {:else}
                    <PanelBottomOpen size={16} />
                  {/if}
                </Button>
              </Tooltip>
            </div>
          </div>
        </svelte:fragment>

        <svelte:fragment slot="body">
          <div bind:this={editorOutputDiv} />
        </svelte:fragment>
      </Panel>
    {/if}
  </CssGrid>

  {#if showCommandFormBuilder}
    <CssGridGutter track={1} type="column" />
    {#if phoenixContext.commandDictionary !== null}
      <CommandPanel {phoenixContext} {commandInfoMapper} {editorSequenceView} />
    {:else}
      <Panel overflowYBody="hidden" padBody>
        <svelte:fragment slot="header">
          <SectionTitle><span class="p-2">Selected Command</span></SectionTitle>
        </svelte:fragment>

        <svelte:fragment slot="body">
          <div class="p-2 text-muted-foreground">Select a parcel to enable the Selected Command panel.</div>
        </svelte:fragment>
      </Panel>
    {/if}
  {/if}
</CssGrid>
