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
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import CollapseIcon from 'bootstrap-icons/icons/arrow-bar-down.svg?component';
  import ExpandIcon from 'bootstrap-icons/icons/arrow-bar-up.svg?component';
  import ClipboardIcon from 'bootstrap-icons/icons/clipboard.svg?component';
  import DownloadIcon from 'bootstrap-icons/icons/download.svg?component';
  import { basicSetup, EditorView } from 'codemirror';
  import { debounce } from 'lodash-es';
  import { SquareCode } from 'lucide-svelte';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { ActionDefinition } from '../../types/actions';
  import { blockTheme } from '../../utilities/codemirror/themes/block';
  import { downloadBlob } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { phoenixResources } from '../../utilities/sequence-editor/adaptation-resources';
  import { pluralize } from '../../utilities/text';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import { tooltip } from '../../utilities/tooltip';
  import Menu from '../menus/Menu.svelte';
  import MenuItem from '../menus/MenuItem.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import CommandPanel from './CommandPanel/CommandPanel.svelte';

  export let actionsWithSequenceParameters: ActionDefinition[] = [];
  export let phoenixContext: PhoenixContext;
  export let includeActions: boolean = false;
  export let previewOnly: boolean = false;
  export let readOnly: boolean = false;
  export let sequenceAdaptation: PhoenixAdaptation;
  export let sequenceName: string = '';
  export let sequenceDefinition: string = '';
  export let sequenceOutput: string = '';
  export let showCommandFormBuilder: boolean = false;
  export let title: string = 'Sequence - Definition Editor';
  export let userSequenceEditorColumns: string;
  export let userSequenceEditorColumnsWithFormBuilder: string;

  const dispatch = createEventDispatcher<{
    runAction: ActionDefinition;
    save: string;
    sequence: { input: string; output?: string };
  }>();

  let actionMenu: Menu;
  let compartmentAdaptation: Compartment;
  let compartmentOutputAdaptation: Compartment;
  let compartmentReadonly: Compartment;
  let disableCopyAndExport: boolean = true;
  let editorHeights: string = '1.88fr 3px 80px';
  let editorOutputDiv: HTMLDivElement;
  let editorOutputView: EditorView;
  let editorSequenceDiv: HTMLDivElement;
  let editorSequenceView: EditorView;
  let menu: Menu;
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

  $: commandInfoMapper = sequenceAdaptation.input.commandInfoMapper;

  $: if (phoenixContext && sequenceAdaptation.input.getEditorExtension) {
    inputEditorExtension = sequenceAdaptation.input.getEditorExtension(phoenixContext, phoenixResources);
  }

  $: if (phoenixContext && selectedOutputFormat?.getEditorExtension) {
    outputEditorExtension = selectedOutputFormat.getEditorExtension(phoenixContext, phoenixResources);
  }

  // insert sequence
  $: editorSequenceView?.dispatch({
    changes: { from: 0, insert: sequenceDefinition, to: editorSequenceView.state.doc.length },
  });

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
    effects: compartmentReadonly.reconfigure([EditorState.readOnly.of(readOnly || previewOnly)]),
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

  async function sequenceUpdateListener(viewUpdate: ViewUpdate): Promise<void> {
    const sequence = viewUpdate.state.doc.toString();
    disableCopyAndExport = sequence === '';
    let output = selectedOutputFormat?.toOutputFormat?.(sequence, phoenixContext, sequenceName);

    editorOutputView.dispatch({ changes: { from: 0, insert: output ?? '', to: editorOutputView.state.doc.length } });

    updatedSequenceDefinition = sequence;
    if (output !== undefined) {
      dispatch('sequence', { input: sequence, output });
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
    const fileExtension = sequenceName.replace(sequenceAdaptation.input.fileExtension, outputLanguage.fileExtension);
    downloadBlob(new Blob([editorOutputView.state.doc.toString()], { type: 'text/plain' }), fileExtension);
  }

  function downloadInputFormat(): void {
    downloadBlob(new Blob([editorSequenceView.state.doc.toString()], { type: 'text/plain' }), sequenceName); // TODO configure file extension to be customizable
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

  function onRunAction(action: ActionDefinition) {
    dispatch('runAction', action);
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
        EditorView.updateListener.of(debounce(sequenceUpdateListener, 250)),
        EditorView.updateListener.of(selectedCommandUpdateListener),
        blockTheme,
        compartmentAdaptation.of(inputEditorExtension),
        compartmentReadonly.of([EditorState.readOnly.of(readOnly || previewOnly)]),
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

<CssGrid class="w-full" bind:columns={commandFormBuilderGrid} minHeight={'0'}>
  <CssGrid rows={editorHeights} minHeight={'0'}>
    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>{title}{readOnly ? ' (Read-only)' : ''}{previewOnly ? ' (Preview-only)' : ''}</SectionTitle>

        <div class="right">
          {#if includeActions}
            <div class="app-menu" role="none" on:click|stopPropagation={() => actionMenu.toggle()}>
              <button
                disabled={sequenceName === '' || actionsWithSequenceParameters.length === 0}
                class="st-button icon-button secondary"
              >
                {#if actionsWithSequenceParameters.length > 0}
                  <div class="actions-chip">{actionsWithSequenceParameters.length}</div>
                {/if}
                Action{pluralize(actionsWithSequenceParameters.length)}
                <ChevronDownIcon />
              </button>
              <Menu bind:this={actionMenu}>
                {#each actionsWithSequenceParameters as action}
                  <MenuItem
                    use={[
                      [
                        permissionHandler,
                        {
                          hasPermission: !readOnly,
                          permissionError: 'You do not have permission to run this action.',
                        },
                      ],
                    ]}
                    on:click={() => {
                      onRunAction(action);
                      actionMenu.toggle();
                    }}
                  >
                    <SquareCode size={16} />
                    {action?.name}
                  </MenuItem>
                {/each}
              </Menu>
            </div>
          {/if}

          <button
            use:tooltip={{ content: 'Show Error Panel', placement: 'top' }}
            class="st-button icon-button secondary"
            on:click={showErrorPanel}
          >
            Error Panel
          </button>

          <button
            use:tooltip={{ content: 'Format sequence whitespace', placement: 'top' }}
            class="st-button icon-button secondary"
            on:click={formatDocument}
          >
            Format
          </button>

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

          {#if showOutputs}
            <div class="app-menu" role="none" on:click|stopPropagation={() => menu.toggle()}>
              <button class="st-button icon-button secondary">
                Output
                <ChevronDownIcon />
              </button>

              <Menu bind:this={menu}>
                {#each sequenceAdaptation.outputs as outputFormatItem}
                  <div
                    use:tooltip={{
                      content: `Copy sequence contents as ${outputFormatItem?.name} to clipboard`,
                      placement: 'top',
                    }}
                  >
                    <MenuItem on:click={copyOutputFormatToClipboard} disabled={disableCopyAndExport}>
                      <ClipboardIcon />
                      {outputFormatItem?.name}
                    </MenuItem>
                  </div>

                  <div
                    use:tooltip={{
                      content: `Download sequence contents as ${outputFormatItem?.name}`,
                      placement: 'top',
                    }}
                  >
                    <MenuItem on:click={() => downloadOutputFormat(outputFormatItem)} disabled={disableCopyAndExport}>
                      <DownloadIcon />
                      {outputFormatItem?.name}
                    </MenuItem>
                  </div>
                {/each}
              </Menu>
            </div>
          {/if}
          {#if !(readOnly || previewOnly)}
            <button
              class="st-button icon-button"
              class:secondary={!isSequenceDefinitionUpdated}
              disabled={!isSequenceDefinitionUpdated}
              on:click={onSave}
            >
              Save
            </button>
          {/if}
        </div>
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
            {#if sequenceAdaptation.outputs.length > 0}
              <div class="output-format">
                <label class="text-xs text-muted-foreground" for="outputFormat">Output Format</label>
                <select bind:value={selectedOutputFormat} class="st-select w-full" name="outputFormat">
                  {#each sequenceAdaptation.outputs as outputFormatItem}
                    <option value={outputFormatItem}>
                      {outputFormatItem.name}
                    </option>
                  {/each}
                </select>
              </div>
            {/if}

            <button
              use:tooltip={{ content: toggleSeqJsonPreview ? `Collapse Editor` : `Expand Editor`, placement: 'top' }}
              class="st-button icon"
              on:click={toggleSeqJsonEditor}
            >
              {#if toggleSeqJsonPreview}
                <CollapseIcon />
              {:else}
                <ExpandIcon />
              {/if}
            </button>
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
      <Panel overflowYBody="hidden" padBody={true}>
        <svelte:fragment slot="header">
          <SectionTitle><span class="command-title">Selected Command</span></SectionTitle>
        </svelte:fragment>

        <svelte:fragment slot="body">
          <div class="st-typography-body no-selected-parcel">Select a parcel to enable the Selected Command panel.</div>
        </svelte:fragment>
      </Panel>
    {/if}
  {/if}
</CssGrid>

<style>
  .app-menu {
    align-items: center;
    cursor: pointer;
    display: flex;
    gap: 5px;
    justify-content: center;
    position: relative;
  }

  .actions-chip {
    background-color: var(--st-gray-15);
    border-radius: 40px;
    color: black;
    min-width: 16px;
    padding: 0px 4px;
  }

  .no-selected-parcel {
    padding: 8px;
  }

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

  .output-format {
    align-items: center;
    display: flex;
  }

  .output-format label {
    width: 10rem;
  }

  .command-title {
    padding: 8px;
  }
</style>
