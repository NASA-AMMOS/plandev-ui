<svelte:options immutable={true} />

<script lang="ts">
  import { indentSelection } from '@codemirror/commands';
  import { json } from '@codemirror/lang-json';
  import { indentService, syntaxTree } from '@codemirror/language';
  import { lintGutter } from '@codemirror/lint';
  import { Compartment, EditorState } from '@codemirror/state';
  import type { ViewUpdate } from '@codemirror/view';
  import type { SyntaxNode } from '@lezer/common';
  import type { ChannelDictionary, CommandDictionary, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
  import CollapseIcon from 'bootstrap-icons/icons/arrow-bar-down.svg?component';
  import ExpandIcon from 'bootstrap-icons/icons/arrow-bar-up.svg?component';
  import ClipboardIcon from 'bootstrap-icons/icons/clipboard.svg?component';
  import SaveIcon from 'bootstrap-icons/icons/save.svg?component';
  import { EditorView, basicSetup } from 'codemirror';
  import { debounce } from 'lodash-es';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import {
    inputFormat,
    outputFormat,
    sequenceAdaptation,
    setSequenceAdaptation,
  } from '../../stores/sequence-adaptation';
  import {
    channelDictionaries,
    commandDictionaries,
    getParsedChannelDictionary,
    getParsedCommandDictionary,
    getParsedParameterDictionary,
    parameterDictionaries as parameterDictionariesStore,
    parcelToParameterDictionaries,
    userSequenceEditorColumns,
    userSequenceEditorColumnsWithFormBuilder,
  } from '../../stores/sequencing';
  import type { User } from '../../types/app';
  import type { Parcel } from '../../types/sequencing';
  import { setupLanguageSupport } from '../../utilities/codemirror';
  import effects from '../../utilities/effects';
  import { seqJsonLinter } from '../../utilities/sequence-editor/seq-json-linter';
  import { sequenceAutoIndent } from '../../utilities/sequence-editor/sequence-autoindent';
  import { sequenceCompletion } from '../../utilities/sequence-editor/sequence-completion';
  import { sequenceLinter } from '../../utilities/sequence-editor/sequence-linter';
  import { sequenceTooltip } from '../../utilities/sequence-editor/sequence-tooltip';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import { tooltip } from '../../utilities/tooltip';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import SelectedCommand from './form/SelectedCommand.svelte';

  export let parcel: Parcel | null;
  export let showCommandFormBuilder: boolean = false;
  export let readOnly: boolean = false;
  export let sequenceName: string = '';
  export let sequenceDefinition: string = '';
  export let sequenceOutput: string = '';
  export let title: string = 'Sequence - Definition Editor';
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    sequence: { input: string; output: string };
  }>();

  let clientHeightGridRightBottom: number;
  let clientHeightGridRightTop: number;
  let compartmentSeqJsonLinter: Compartment;
  let compartmentSeqLanguage: Compartment;
  let compartmentSeqLinter: Compartment;
  let compartmentSeqTooltip: Compartment;
  let channelDictionary: ChannelDictionary | null;
  let commandDictionary: CommandDictionary | null;
  let disableCopyAndExport: boolean = true;
  let parameterDictionaries: ParameterDictionary[] = [];
  let commandFormBuilderGrid: string;
  let editorOutputDiv: HTMLDivElement;
  let editorOutputView: EditorView;
  let editorSequenceDiv: HTMLDivElement;
  let editorSequenceView: EditorView;
  let selectedNode: SyntaxNode | null;
  let toggleSeqJsonPreview: boolean = false;

  $: {
    loadSequenceAdaptation(parcel?.sequence_adaptation_id);
  }

  $: {
    if (editorSequenceView) {
      // insert sequence
      editorSequenceView.dispatch({
        changes: { from: 0, insert: sequenceDefinition, to: editorSequenceView.state.doc.length },
      });

      // apply indentation
      editorSequenceView.update([
        editorSequenceView.state.update({
          selection: { anchor: 0, head: editorSequenceView.state.doc.length },
        }),
      ]);
      indentSelection({
        dispatch: transaction => editorSequenceView.update([transaction]),
        state: editorSequenceView.state,
      });
    }
  }

  $: {
    commandFormBuilderGrid = showCommandFormBuilder
      ? $userSequenceEditorColumnsWithFormBuilder
      : $userSequenceEditorColumns;
  }

  $: {
    const unparsedChannelDictionary = $channelDictionaries.find(cd => cd.id === parcel?.channel_dictionary_id);
    const unparsedCommandDictionary = $commandDictionaries.find(cd => cd.id === parcel?.command_dictionary_id);
    const unparsedParameterDictionaries = $parameterDictionariesStore.filter(pd => {
      const parameterDictionary = $parcelToParameterDictionaries.find(
        p => p.parameter_dictionary_id === pd.id && p.parcel_id === parcel?.id,
      );

      if (parameterDictionary) {
        return pd;
      }
    });

    if (unparsedCommandDictionary) {
      Promise.all([
        getParsedCommandDictionary(unparsedCommandDictionary, user),
        unparsedChannelDictionary ? getParsedChannelDictionary(unparsedChannelDictionary, user) : null,
        ...unparsedParameterDictionaries.map(unparsedParameterDictionary => {
          return getParsedParameterDictionary(unparsedParameterDictionary, user);
        }),
      ]).then(([parsedCommandDictionary, parsedChannelDictionary, ...parsedParameterDictionaries]) => {
        const nonNullParsedParameterDictionaries = parsedParameterDictionaries.filter(
          (pd): pd is ParameterDictionary => !!pd,
        );

        channelDictionary = parsedChannelDictionary;
        commandDictionary = parsedCommandDictionary;
        parameterDictionaries = nonNullParsedParameterDictionaries;

        // Reconfigure sequence editor.
        editorSequenceView.dispatch({
          effects: compartmentSeqLanguage.reconfigure(
            setupLanguageSupport(
              sequenceCompletion(parsedChannelDictionary, parsedCommandDictionary, nonNullParsedParameterDictionaries),
            ),
          ),
        });
        editorSequenceView.dispatch({
          effects: compartmentSeqLinter.reconfigure(
            sequenceLinter(parsedChannelDictionary, parsedCommandDictionary, nonNullParsedParameterDictionaries),
          ),
        });
        editorSequenceView.dispatch({
          effects: compartmentSeqTooltip.reconfigure(
            sequenceTooltip(parsedChannelDictionary, parsedCommandDictionary, nonNullParsedParameterDictionaries),
          ),
        });

        // Reconfigure seq JSON editor.
        editorOutputView.dispatch({
          effects: compartmentSeqJsonLinter.reconfigure(seqJsonLinter(parsedCommandDictionary)),
        });
      });
    }
  }

  onMount(() => {
    compartmentSeqJsonLinter = new Compartment();
    compartmentSeqLanguage = new Compartment();
    compartmentSeqLinter = new Compartment();
    compartmentSeqTooltip = new Compartment();

    editorSequenceView = new EditorView({
      doc: sequenceDefinition,
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        EditorView.theme({ '.cm-gutter': { 'min-height': `${clientHeightGridRightTop}px` } }),
        lintGutter(),
        compartmentSeqLanguage.of(setupLanguageSupport(sequenceCompletion(null, null, []))),
        compartmentSeqLinter.of(sequenceLinter()),
        compartmentSeqTooltip.of(sequenceTooltip()),
        EditorView.updateListener.of(debounce(sequenceUpdateListener, 250)),
        EditorView.updateListener.of(selectedCommandUpdateListener),
        indentService.of(sequenceAutoIndent()),
        EditorState.readOnly.of(readOnly),
      ],
      parent: editorSequenceDiv,
    });

    editorOutputView = new EditorView({
      doc: sequenceOutput,
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        EditorView.theme({ '.cm-gutter': { 'min-height': `${clientHeightGridRightBottom}px` } }),
        EditorView.editable.of(false),
        lintGutter(),
        json(),
        compartmentSeqJsonLinter.of(seqJsonLinter()),
        EditorState.readOnly.of(readOnly),
      ],
      parent: editorOutputDiv,
    });
  });

  onDestroy(() => {
    resetSequenceAdaptation();
  });

  async function loadSequenceAdaptation(id: number | null | undefined): Promise<void> {
    if (id) {
      const adaptation = await effects.getSequenceAdaptation(id, user);

      if (adaptation) {
        try {
          // This evaluates the custom sequence adaptation that is optionally provided by the user.
          Function(adaptation.adaptation)();

          setSequenceAdaptation();
        } catch (e) {
          console.error(e);
          showFailureToast('Invalid sequence adaptation');
        }
      }
    } else {
      resetSequenceAdaptation();
    }
  }

  function resetSequenceAdaptation(): void {
    globalThis.SequenceAdaptation = undefined;
    setSequenceAdaptation();
  }

  async function sequenceUpdateListener(viewUpdate: ViewUpdate) {
    const sequence = viewUpdate.state.doc.toString();
    disableCopyAndExport = sequence === '';
    const tree = syntaxTree(viewUpdate.state);
    const output = await $outputFormat?.toOutputFormat(tree, sequence, commandDictionary, sequenceName);

    if ($sequenceAdaptation?.modifyOutput !== undefined && output !== undefined) {
      $sequenceAdaptation?.modifyOutput(output, parameterDictionaries, channelDictionary);
    }

    editorOutputView.dispatch({ changes: { from: 0, insert: output, to: editorOutputView.state.doc.length } });

    if (output !== undefined) {
      dispatch('sequence', { input: sequence, output });
    }
  }

  function selectedCommandUpdateListener(viewUpdate: ViewUpdate) {
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

  function downloadOutputFormat() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([editorOutputView.state.doc.toString()], { type: 'application/json' }));
    a.download = `${sequenceName}.json`;
    a.click();
  }

  function downloadInputFormat() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([editorSequenceView.state.doc.toString()], { type: 'text/plain' }));
    a.download = `${sequenceName}.txt`;
    a.click();
  }

  async function copyOutputFormatToClipboard() {
    try {
      await navigator.clipboard.writeText(editorOutputView.state.doc.toString());
      showSuccessToast(`${$outputFormat?.name} copied to clipboard`);
    } catch {
      showFailureToast(`Error copying ${$outputFormat?.name} to clipboard`);
    }
  }

  async function copyInputFormatToClipboard() {
    try {
      await navigator.clipboard.writeText(editorSequenceView.state.doc.toString());
      showSuccessToast(`${$inputFormat?.name} copied to clipboard`);
    } catch {
      showFailureToast(`Error copying ${$inputFormat?.name} to clipboard`);
    }
  }

  function toggleSeqJsonEditor() {
    toggleSeqJsonPreview = !toggleSeqJsonPreview;
  }
</script>

<CssGrid bind:columns={commandFormBuilderGrid} minHeight={'0'}>
  <CssGrid rows={toggleSeqJsonPreview ? '1fr 3px 1fr' : '1.88fr 3px 80px'} minHeight={'0'}>
    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>{title}</SectionTitle>

        <div class="right">
          <button
            use:tooltip={{ content: `Copy sequence contents as ${$inputFormat?.name} to clipboard`, placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            on:click={copyInputFormatToClipboard}
            disabled={disableCopyAndExport}><ClipboardIcon /> {$inputFormat?.name}</button
          >
          <button
            use:tooltip={{ content: `Copy sequence contents as ${$outputFormat?.name} to clipboard`, placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            on:click={copyOutputFormatToClipboard}
            disabled={disableCopyAndExport}><ClipboardIcon /> {$outputFormat?.name}</button
          >
          <button
            use:tooltip={{
              content: `Download sequence contents as ${$inputFormat?.name}`,
              placement: 'top',
            }}
            class="st-button icon-button secondary ellipsis"
            on:click|stopPropagation={downloadInputFormat}
            disabled={disableCopyAndExport}><SaveIcon /> {$inputFormat?.name}</button
          >
          <button
            use:tooltip={{ content: `Download sequence contents as ${$outputFormat?.name}`, placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            on:click|stopPropagation={downloadOutputFormat}
            disabled={disableCopyAndExport}><SaveIcon /> {$outputFormat?.name}</button
          >
        </div>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <div bind:this={editorSequenceDiv} />
      </svelte:fragment>
    </Panel>

    <CssGridGutter draggable={toggleSeqJsonPreview} track={1} type="row" />
    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>{$sequenceAdaptation?.outputFormat.name} (Read-only)</SectionTitle>

        <div class="right">
          <button
            use:tooltip={{ content: toggleSeqJsonPreview ? `Collapse Editor` : `Expand Editor`, placement: 'top' }}
            class="st-button icon"
            on:click={toggleSeqJsonEditor}
          >
            {#if toggleSeqJsonPreview}
              <CollapseIcon />
            {:else}
              <ExpandIcon />
            {/if}</button
          >
        </div>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <div bind:this={editorOutputDiv} />
      </svelte:fragment>
    </Panel>
  </CssGrid>

  <CssGridGutter track={1} type="column" />

  {#if showCommandFormBuilder}
    {#if !!commandDictionary && !!selectedNode}
      <SelectedCommand
        node={selectedNode}
        {channelDictionary}
        {commandDictionary}
        {editorSequenceView}
        {parameterDictionaries}
      />
    {:else}
      <Panel overflowYBody="hidden" padBody={false}>
        <svelte:fragment slot="header">
          <SectionTitle>Selected Command</SectionTitle>
        </svelte:fragment>

        <svelte:fragment slot="body">
          <div class="st-typography-body no-selected-parcel">Select a parcel to enable the Selected Command panel.</div>
        </svelte:fragment>
      </Panel>
    {/if}
  {/if}
</CssGrid>

<style>
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
</style>
