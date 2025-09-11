<svelte:options immutable={true} />

<script lang="ts">
  import { standardKeymap } from '@codemirror/commands';
  import { json } from '@codemirror/lang-json';
  import { indentService, syntaxTree } from '@codemirror/language';
  import { lintGutter, openLintPanel } from '@codemirror/lint';
  import { Compartment, EditorState } from '@codemirror/state';
  import { type ViewUpdate, keymap } from '@codemirror/view';
  import type { SyntaxNode, Tree } from '@lezer/common';
  import type { ChannelDictionary, CommandDictionary, FswCommand, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
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
  import type { GlobalType } from '../../types/global-type';
  import {
    type ArgTextDef,
    type IInputFormat,
    type IOutputFormat,
    type ISequenceAdaptation,
    type LibrarySequence,
    type LibrarySequenceMap,
    type TimeTagInfo,
  } from '../../types/sequencing';
  import { blockTheme } from '../../utilities/codemirror/themes/block';
  import { downloadBlob, downloadJSON } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import type { CommandInfoMapper } from '../../utilities/sequence-editor/command-info-mapper';
  import { inputLinter, outputLinter } from '../../utilities/sequence-editor/extension-points';
  import { setupLanguageSupport } from '../../utilities/sequence-editor/languages/seq-n/seq-n';
  import {
    seqNBlockHighlighter,
    seqNHighlightBlock,
  } from '../../utilities/sequence-editor/languages/seq-n/seq-n-highlighter';
  import { SeqNCommandInfoMapper } from '../../utilities/sequence-editor/languages/seq-n/seq-n-tree-utils';
  import {
    setupVmlLanguageSupport,
    vmlAdaptation,
    vmlBlockHighlighter,
    vmlHighlightBlock,
  } from '../../utilities/sequence-editor/languages/vml/vml';
  import { vmlAutoComplete } from '../../utilities/sequence-editor/languages/vml/vml-adaptation';
  import { vmlFormat } from '../../utilities/sequence-editor/languages/vml/vml-formatter';
  import { vmlLinter } from '../../utilities/sequence-editor/languages/vml/vml-linter';
  import { vmlTooltip } from '../../utilities/sequence-editor/languages/vml/vml-tooltip';
  import { VmlCommandInfoMapper } from '../../utilities/sequence-editor/languages/vml/vml-tree-utils';
  import { getDefaultSequenceAdaptation } from '../../utilities/sequence-editor/sequence-adaptation';
  import { seqNFormat } from '../../utilities/sequence-editor/sequence-autoindent';
  import { sequenceTooltip } from '../../utilities/sequence-editor/sequence-tooltip';
  import {
    getArgumentInfo,
    getCommandDef,
    getTimeTagInfo,
    getVariablesInScope,
    isVmlSequence,
    unquoteUnescape,
  } from '../../utilities/sequence-editor/sequence-utils';
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
  export let adaptationGlobals: GlobalType[] = [];
  export let channelDictionary: ChannelDictionary | null = null;
  export let commandDictionary: CommandDictionary | null = null;
  export let includeActions: boolean = false;
  export let inputFormat: IInputFormat | undefined = undefined;
  export let librarySequences: LibrarySequence[] = [];
  export let outputFormats: IOutputFormat[] = [];
  export let parameterDictionaries: ParameterDictionary[] = [];
  export let previewOnly: boolean = false;
  export let readOnly: boolean = false;
  export let sequenceAdaptation: ISequenceAdaptation = getDefaultSequenceAdaptation();
  export let sequenceDefinition: string = '';
  export let sequenceName: string = '';
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

  const debouncedSeqNHighlightBlock = debounce(seqNHighlightBlock, 250);
  const debouncedVmlHighlightBlock = debounce(vmlHighlightBlock, 250);

  let actionMenu: Menu;
  let adaptation: ISequenceAdaptation = sequenceAdaptation;
  let argInfoArray: ArgTextDef[] = [];
  let commandDef: FswCommand | null = null;
  let commandFormBuilderGrid: string;
  let commandInfoMapper: CommandInfoMapper = new SeqNCommandInfoMapper();
  let commandName: string | null = null;
  let commandNameNode: SyntaxNode | null = null;
  let commandNode: SyntaxNode | null = null;
  let compartmentReadonly: Compartment;
  let compartmentSeqAutocomplete: Compartment;
  let compartmentSeqHighlighter: Compartment;
  let compartmentSeqJsonLinter: Compartment;
  let compartmentSeqLanguage: Compartment;
  let compartmentSeqLinter: Compartment;
  let compartmentSeqTooltip: Compartment;
  let currentTree: Tree;
  let disableCopyAndExport: boolean = true;
  let editorHeights: string = '1.88fr 3px 80px';
  let editorOutputDiv: HTMLDivElement;
  let editorOutputView: EditorView;
  let editorSequenceDiv: HTMLDivElement;
  let editorSequenceView: EditorView;
  let isInVmlMode: boolean = false;
  let librarySequenceMap: LibrarySequenceMap = {};
  let menu: Menu;
  let selectedNode: SyntaxNode | null;
  let selectedOutputFormat: IOutputFormat | undefined;
  let showOutputs: boolean = true;
  let previousShowOutputs: boolean = showOutputs;
  let timeTagNode: TimeTagInfo = null;
  let toggleSeqJsonPreview: boolean = false;
  let variablesInScope: string[] = [];
  let updatedSequenceDefinition: string = sequenceDefinition;
  let isSequenceDefinitionUpdated: boolean = false;

  $: isInVmlMode = isVmlSequence(sequenceName);

  $: if (editorSequenceView) {
    // insert sequence
    editorSequenceView.dispatch({
      changes: { from: 0, insert: sequenceDefinition, to: editorSequenceView.state.doc.length },
    });
  }

  $: if (compartmentSeqHighlighter && editorSequenceView) {
    if (isInVmlMode) {
      editorSequenceView.dispatch({
        effects: compartmentSeqHighlighter.reconfigure([
          EditorView.updateListener.of(debouncedVmlHighlightBlock),
          vmlBlockHighlighter,
        ]),
      });
    } else {
      editorSequenceView.dispatch({
        effects: compartmentSeqHighlighter.reconfigure([
          EditorView.updateListener.of(debouncedSeqNHighlightBlock),
          seqNBlockHighlighter,
        ]),
      });
    }
  }

  $: commandFormBuilderGrid = showCommandFormBuilder
    ? userSequenceEditorColumnsWithFormBuilder
    : userSequenceEditorColumns;

  $: librarySequenceMap = Object.fromEntries(librarySequences.map(seq => [seq.name, seq]));
  $: {
    if (commandDictionary) {
      if (sequenceName && isInVmlMode) {
        editorSequenceView.dispatch({
          effects: compartmentSeqLanguage.reconfigure(
            setupVmlLanguageSupport(vmlAutoComplete(commandDictionary, adaptation.globals ?? [], librarySequenceMap)),
          ),
        });
        editorSequenceView.dispatch({
          effects: compartmentSeqLinter.reconfigure(
            vmlLinter(commandDictionary, librarySequenceMap, adaptation.globals ?? []),
          ),
        });
        editorSequenceView.dispatch({
          effects: compartmentSeqTooltip.reconfigure(vmlTooltip(commandDictionary, librarySequenceMap)),
        });
      } else {
        // Reconfigure sequence editor.
        editorSequenceView.dispatch({
          effects: [
            // TODO: use librarySequenceMap here, requires a change to adaptations so defer until changing adaptation API
            compartmentSeqLanguage.reconfigure(
              setupLanguageSupport(
                adaptation.autoComplete(channelDictionary, commandDictionary, parameterDictionaries, librarySequences),
              ),
            ),
            compartmentSeqLinter.reconfigure(
              inputLinter(
                adaptation,
                adaptationGlobals,
                channelDictionary,
                commandDictionary,
                parameterDictionaries,
                librarySequences,
              ),
            ),
            compartmentSeqTooltip.reconfigure(
              sequenceTooltip(adaptation, channelDictionary, commandDictionary, parameterDictionaries),
            ),
            ...(adaptation.autoIndent
              ? [compartmentSeqAutocomplete.reconfigure(indentService.of(adaptation.autoIndent()))]
              : []),
          ],
        });

        // Reconfigure seq JSON editor.
        editorOutputView.dispatch({
          effects: compartmentSeqJsonLinter.reconfigure(outputLinter(commandDictionary, selectedOutputFormat)),
        });
      }
    } else {
      commandDictionary = null;
      channelDictionary = null;
      parameterDictionaries = [];
    }
  }
  $: editorSequenceView?.dispatch({
    effects: compartmentReadonly.reconfigure([EditorState.readOnly.of(readOnly || previewOnly)]),
  });

  $: {
    previousShowOutputs = showOutputs;
    showOutputs = !isInVmlMode && outputFormats.length > 0;
  }
  $: if (showOutputs) {
    editorHeights = toggleSeqJsonPreview ? '1fr 3px 1fr' : '1.88fr 3px 80px';
  } else {
    editorHeights = '1fr 3px';
  }

  $: if (sequenceAdaptation) {
    selectedOutputFormat = sequenceAdaptation.outputFormat[0];
  }
  $: if (isInVmlMode) {
    adaptation = vmlAdaptation;
  } else {
    adaptation = sequenceAdaptation;
  }
  $: commandNode = commandInfoMapper.getContainingCommand(selectedNode);
  $: commandNameNode = commandInfoMapper.getNameNode(commandNode);
  $: commandName =
    commandNameNode && unquoteUnescape(editorSequenceView.state.sliceDoc(commandNameNode.from, commandNameNode.to));
  $: commandDef = getCommandDef(commandDictionary, librarySequenceMap, commandName ?? '');
  $: timeTagNode = getTimeTagInfo(editorSequenceView, commandNode);
  $: argInfoArray = getArgumentInfo(
    commandDef,
    commandInfoMapper,
    channelDictionary,
    editorSequenceView,
    commandInfoMapper.getArgumentNodeContainer(commandNode),
    commandDef?.arguments,
    undefined,
    parameterDictionaries,
    adaptation,
  );
  $: variablesInScope = getVariablesInScope(
    commandInfoMapper,
    editorSequenceView,
    adaptation,
    currentTree,
    commandNode?.from,
  );

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
        json(),
        compartmentSeqJsonLinter.of(outputLinter()),
        EditorState.readOnly.of(readOnly),
      ],
      parent: editorOutputDiv,
    });
  }

  $: updatedSequenceDefinition = sequenceDefinition;
  $: isSequenceDefinitionUpdated = updatedSequenceDefinition !== sequenceDefinition;

  function compile(): void {
    if (selectedOutputFormat?.compile) {
      selectedOutputFormat.compile(sequenceOutput);
    }
  }

  async function sequenceUpdateListener(viewUpdate: ViewUpdate): Promise<void> {
    const sequence = viewUpdate.state.doc.toString();
    disableCopyAndExport = sequence === '';
    const tree = syntaxTree(viewUpdate.state);
    let output = await selectedOutputFormat?.toOutputFormat?.(tree, sequence, commandDictionary, sequenceName);

    if (adaptation.modifyOutput !== undefined && output !== undefined) {
      const modifiedOutput = adaptation.modifyOutput(output, parameterDictionaries, channelDictionary);
      if (modifiedOutput === null) {
        output = 'modifyOutput returned null. Verify your adaptation is correct';
      } else if (modifiedOutput === undefined) {
        output = 'modifyOutput returned undefined. Verify your adaptation is correct';
      } else if (typeof modifiedOutput === 'object') {
        output = JSON.stringify(modifiedOutput);
      } else {
        output = `${modifiedOutput}`;
      }
    }

    editorOutputView.dispatch({ changes: { from: 0, insert: output, to: editorOutputView.state.doc.length } });

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
      if (isInVmlMode) {
        commandInfoMapper = new VmlCommandInfoMapper();
      } else {
        commandInfoMapper = new SeqNCommandInfoMapper();
      }
      selectedNode = updatedSelectionNode;
      currentTree = tree;
    }
  }

  function downloadOutputFormat(outputFormat: IOutputFormat): void {
    const fileExtension = `${sequenceName}.${selectedOutputFormat?.fileExtension}`;

    if (outputFormat?.fileExtension === 'json') {
      downloadJSON(JSON.parse(editorOutputView.state.doc.toString()), fileExtension);
    } else {
      downloadBlob(new Blob([editorOutputView.state.doc.toString()], { type: 'text/plain' }), fileExtension);
    }
  }

  function downloadInputFormat(): void {
    downloadBlob(new Blob([editorSequenceView.state.doc.toString()], { type: 'text/plain' }), `${sequenceName}.txt`);
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
      showSuccessToast(`${inputFormat?.name} copied to clipboard`);
    } catch {
      showFailureToast(`Error copying ${inputFormat?.name} to clipboard`);
    }
  }

  function toggleSeqJsonEditor(): void {
    toggleSeqJsonPreview = !toggleSeqJsonPreview;
  }

  function showErrorPanel() {
    openLintPanel(editorSequenceView);
  }

  function formatDocument() {
    if (isInVmlMode) {
      vmlFormat(editorSequenceView);
    } else {
      seqNFormat(editorSequenceView);
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
    compartmentSeqJsonLinter = new Compartment();
    compartmentSeqLanguage = new Compartment();
    compartmentSeqLinter = new Compartment();
    compartmentSeqTooltip = new Compartment();
    compartmentSeqAutocomplete = new Compartment();
    compartmentSeqHighlighter = new Compartment();

    editorSequenceView = new EditorView({
      doc: sequenceDefinition,
      extensions: [
        basicSetup,
        keymap.of([...standardKeymap, { key: 'Ctrl-s', mac: 'Cmd-s', run: onSave }]),
        EditorView.lineWrapping,
        EditorView.theme({ '.cm-gutter': { 'min-height': '0px' } }),
        lintGutter(),
        compartmentSeqLanguage.of(setupLanguageSupport(adaptation.autoComplete(null, null, [], []))),
        compartmentSeqLinter.of(inputLinter(adaptation, adaptationGlobals)),
        compartmentSeqTooltip.of(sequenceTooltip(adaptation)),
        EditorView.updateListener.of(debounce(sequenceUpdateListener, 250)),
        EditorView.updateListener.of(selectedCommandUpdateListener),
        blockTheme,
        compartmentSeqHighlighter.of([EditorView.updateListener.of(debouncedSeqNHighlightBlock), seqNBlockHighlighter]),
        ...(adaptation.autoIndent ? [compartmentSeqAutocomplete.of(indentService.of(adaptation.autoIndent()))] : []),
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
        json(),
        compartmentSeqJsonLinter.of(outputLinter()),
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
        <SectionTitle>{title}</SectionTitle>

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
                {#each outputFormats as outputFormatItem}
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

            {#if selectedOutputFormat?.compile}
              <button class="st-button icon-button secondary" on:click={compile}>Compile</button>
            {/if}
          {/if}
          {#if !readOnly}
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
            {#if outputFormats}
              <div class="output-format">
                <label class="text-xs text-muted-foreground" for="outputFormat">Output Format</label>
                <select bind:value={selectedOutputFormat} class="st-select w-full" name="outputFormat">
                  {#each outputFormats as outputFormatItem}
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
    {#if commandDictionary !== null}
      <CommandPanel
        {argInfoArray}
        {commandDef}
        {commandDictionary}
        {commandInfoMapper}
        {commandName}
        {commandNameNode}
        {commandNode}
        {editorSequenceView}
        {timeTagNode}
        {variablesInScope}
      />
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
