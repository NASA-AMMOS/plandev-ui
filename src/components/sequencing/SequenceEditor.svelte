<svelte:options immutable={true} />

<script lang="ts">
  import { json } from '@codemirror/lang-json';
  import { syntaxTree } from '@codemirror/language';
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
  import { createEventDispatcher, onMount } from 'svelte';
  import {
    channelDictionaries,
    commandDictionaries,
    getParsedChannelDictionary,
    getParsedCommandDictionary,
    getParsedParameterDictionary,
    parameterDictionaries as parameterDictionariesStore,
    parcel,
    parcelToParameterDictionaries,
    userSequenceEditorColumns,
    userSequenceEditorColumnsWithFormBuilder,
  } from '../../stores/sequencing';
  import type { User } from '../../types/app';
  import { setupLanguageSupport } from '../../utilities/codemirror';
  import { seqJsonLinter } from '../../utilities/new-sequence-editor/seq-json-linter';
  import { sequenceCompletion } from '../../utilities/new-sequence-editor/sequence-completion';
  import { sequenceLinter } from '../../utilities/new-sequence-editor/sequence-linter';
  import { sequenceTooltip } from '../../utilities/new-sequence-editor/sequence-tooltip';
  import { sequenceToSeqJson } from '../../utilities/new-sequence-editor/to-seq-json';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import { tooltip } from '../../utilities/tooltip';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import SelectedCommand from './form/SelectedCommand.svelte';

  export let showCommandFormBuilder: boolean = false;
  export let readOnly: boolean = false;
  export let sequenceName: string = '';
  export let sequenceDefinition: string = '';
  export let sequenceSeqJson: string = '';
  export let title: string = 'Sequence - Definition Editor';
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    sequence: { seqJson: string; sequence: string };
  }>();

  let clientHeightGridRightBottom: number;
  let clientHeightGridRightTop: number;
  let compartmentSeqJsonLinter: Compartment;
  let compartmentSeqLanguage: Compartment;
  let compartmentSeqLinter: Compartment;
  let compartmentSeqTooltip: Compartment;
  let channelDictionary: ChannelDictionary | null;
  let commandDictionary: CommandDictionary | null;
  let parameterDictionaries: ParameterDictionary[] = [];
  let commandFormBuilderGrid: string;
  let editorSeqJsonDiv: HTMLDivElement;
  let editorSeqJsonView: EditorView;
  let editorSequenceDiv: HTMLDivElement;
  let editorSequenceView: EditorView;
  let selectedNode: SyntaxNode | null;
  let toggleSeqJsonPreview: boolean = false;

  $: {
    if (editorSequenceView) {
      editorSequenceView.dispatch({
        changes: { from: 0, insert: sequenceDefinition, to: editorSequenceView.state.doc.length },
      });
    }
  }

  $: {
    commandFormBuilderGrid = showCommandFormBuilder
      ? $userSequenceEditorColumnsWithFormBuilder
      : $userSequenceEditorColumns;
  }

  $: {
    const unparsedChannelDictionary = $channelDictionaries.find(cd => cd.id === $parcel?.channel_dictionary_id);
    const unparsedCommandDictionary = $commandDictionaries.find(cd => cd.id === $parcel?.command_dictionary_id);
    const unparsedParameterDictionaries = $parameterDictionariesStore.filter(pd => {
      const parameterDictionary = $parcelToParameterDictionaries.find(p => p.parameter_dictionary_id === pd.id);

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
        editorSeqJsonView.dispatch({
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
        EditorState.readOnly.of(readOnly),
      ],
      parent: editorSequenceDiv,
    });

    editorSeqJsonView = new EditorView({
      doc: sequenceSeqJson,
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
      parent: editorSeqJsonDiv,
    });
  });

  function sequenceUpdateListener(viewUpdate: ViewUpdate) {
    const sequence = viewUpdate.state.doc.toString();

    const tree = syntaxTree(viewUpdate.state);
    const seqJson = sequenceToSeqJson(
      tree,
      sequence,
      commandDictionary,
      parameterDictionaries,
      channelDictionary,
      sequenceName,
    );
    const seqJsonStr = JSON.stringify(seqJson, null, 2);
    editorSeqJsonView.dispatch({ changes: { from: 0, insert: seqJsonStr, to: editorSeqJsonView.state.doc.length } });

    dispatch('sequence', { seqJson: seqJsonStr, sequence });
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

  function downloadSeqJson() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([editorSeqJsonView.state.doc.toString()], { type: 'application/json' }));
    a.download = sequenceName;
    a.click();
  }

  function downloadSeqN() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([editorSequenceView.state.doc.toString()], { type: 'text/plain' }));
    a.download = sequenceName;
    a.click();
  }

  async function copySeqJsonToClipboard() {
    try {
      await navigator.clipboard.writeText(editorSeqJsonView.state.doc.toString());
      showSuccessToast('Sequence.json copied to clipboard');
    } catch {
      showFailureToast('Error copying sequence.json to clipboard');
    }
  }

  async function copySeqNClipboard() {
    try {
      await navigator.clipboard.writeText(editorSequenceView.state.doc.toString());
      showSuccessToast('SeqN copied to clipboard');
    } catch {
      showFailureToast('Error copying SeqN to clipboard');
    }
  }

  function toggleSeqJsonEditor() {
    toggleSeqJsonPreview = !toggleSeqJsonPreview;
  }
</script>

<CssGrid bind:columns={commandFormBuilderGrid} minHeight={'0'}>
  <CssGrid rows={toggleSeqJsonPreview ? '1fr 3px 1fr' : `1.88fr 3px minmax(50px,0.12fr)`} minHeight={'0'}>
    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>{title}</SectionTitle>

        <div class="right">
          <button
            use:tooltip={{ content: `Copy to clipboard`, placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            style={' margin-right: 5px; '}
            on:click={copySeqNClipboard}><ClipboardIcon /> SeqN</button
          >
          <button
            use:tooltip={{ content: `Copy to clipboard`, placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            style={'margin-left: 5px; margin-right: 15px; '}
            on:click={copySeqJsonToClipboard}><ClipboardIcon /> JSON</button
          >
          <button
            use:tooltip={{ content: `Download Seq.json`, placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            style={' margin-left: 15px; margin-right: 2px;'}
            on:click|stopPropagation={downloadSeqN}><SaveIcon /> SeqN</button
          >
          <button
            use:tooltip={{ content: `Download Seq.json`, placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            style={' margin-left: 2px; margin-right: 10px;'}
            on:click|stopPropagation={downloadSeqJson}><SaveIcon /> JSON</button
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
        <SectionTitle>Seq JSON (Read-only)</SectionTitle>

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
        <div bind:this={editorSeqJsonDiv} />
      </svelte:fragment>
    </Panel>
  </CssGrid>

  <CssGridGutter track={1} type="column" />

  {#if !!commandDictionary && !!selectedNode && showCommandFormBuilder}
    <SelectedCommand
      node={selectedNode}
      {channelDictionary}
      {commandDictionary}
      {editorSequenceView}
      {parameterDictionaries}
    />
  {/if}
</CssGrid>

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
  }
</style>
