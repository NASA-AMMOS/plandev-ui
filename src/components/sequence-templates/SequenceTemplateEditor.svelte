<svelte:options immutable={true} />

<script lang="ts">
  import { syntaxTree } from '@codemirror/language';
  import { lintGutter, openLintPanel } from '@codemirror/lint';
  import { Compartment, EditorState } from '@codemirror/state';
  import { type ViewUpdate } from '@codemirror/view';
  import type { SyntaxNode, Tree } from '@lezer/common';
  import type { ChannelDictionary, CommandDictionary, ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
  import type {
    CommandInfoMapper,
    LibrarySequence,
    LibrarySequenceMap,
    NewAdaptationInterface,
    OutputLanguageAdaptation,
    PhoenixContext,
  } from '@nasa-jpl/aerie-sequence-languages';
  import { basicSetup, EditorView } from 'codemirror';
  import { debounce } from 'lodash-es';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { User } from '../../types/app';
  import { type SequenceTemplate } from '../../types/sequence-template';
  import { blockTheme } from '../../utilities/codemirror/themes/block';
  import effects from '../../utilities/effects';
  import { isSaveEvent } from '../../utilities/keyboardEvents';
  import { tooltip } from '../../utilities/tooltip';
  import CommandPanel from '../sequencing/CommandPanel/CommandPanel.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let showCommandFormBuilder: boolean = false;
  export let readOnly: boolean = false;
  export let template: SequenceTemplate;
  export let title: string = 'Sequence Template - Editor';
  export let user: User | null;
  export let channelDictionary: ChannelDictionary | null = null;
  export let commandDictionary: CommandDictionary | null = null;
  export let librarySequences: LibrarySequence[] = [];
  export let parameterDictionaries: ParameterDictionary[] = [];
  export let newSequenceAdaptation: NewAdaptationInterface;

  let sequenceName: string = '';
  let sequenceDefinition: string = '';

  $: sequenceName = template?.name ?? '';
  $: sequenceDefinition = template?.template_definition ?? '';

  const dispatch = createEventDispatcher<{
    download: { template: SequenceTemplate };
    templateChanged: { input: string; output: string };
  }>();

  let clientHeightGridRightTop: number = 0;
  let compartmentAdaptation: Compartment;
  let commandFormBuilderGrid: string;
  let editorSequenceDiv: HTMLDivElement;
  let editorSequenceView: EditorView;
  let selectedNode: SyntaxNode | null;
  let currentTree: Tree;
  let commandInfoMapper: CommandInfoMapper;
  let selectedOutputFormat: OutputLanguageAdaptation | undefined;
  let editorHeights: string = '1fr 3px';
  let columnsWithFormBuilder: string = '3fr 3px 1.5fr';
  let columnsWithNoFormBuilder: string = '3fr 3px';
  let phoenixContext: PhoenixContext;
  let librarySequenceMap: LibrarySequenceMap = {};

  $: commandInfoMapper = newSequenceAdaptation.input.commandInfoMapper;

  $: {
    // Since this insertion will move the cursor back to position 0, test if the content actually changed first
    if (editorSequenceView && sequenceDefinition !== editorSequenceView.state.doc.toString()) {
      // insert sequence
      editorSequenceView.dispatch({
        changes: { from: 0, insert: sequenceDefinition, to: editorSequenceView.state.doc.length },
      });
    }
  }

  $: {
    commandFormBuilderGrid = showCommandFormBuilder ? columnsWithFormBuilder : columnsWithNoFormBuilder;
  }

  $: librarySequenceMap = Object.fromEntries(librarySequences.map(seq => [seq.name, seq]));

  $: phoenixContext = {
    channelDictionary,
    commandDictionary,
    librarySequenceMap,
    parameterDictionaries,
  };

  $: {
    if (editorSequenceView) {
      // Reconfigure sequence editor if adaptation or context change
      editorSequenceView.dispatch({
        effects: [
          compartmentAdaptation.reconfigure((newSequenceAdaptation.input.editorExtension ?? (_ => []))(phoenixContext)),
        ],
      });
    }
  }

  onMount(() => {
    compartmentAdaptation = new Compartment();

    editorSequenceView = new EditorView({
      doc: sequenceDefinition,
      extensions: [
        basicSetup,
        EditorView.lineWrapping,
        EditorView.theme({ '.cm-gutter': { 'min-height': `${clientHeightGridRightTop}px` } }),
        lintGutter(),
        // TODO: Compose the template grammar on top of the editor extension here
        compartmentAdaptation.of((newSequenceAdaptation.input.editorExtension ?? (_ => []))(phoenixContext)),
        EditorView.updateListener.of(debounce(sequenceUpdateListener, 250)),
        EditorView.updateListener.of(selectedCommandUpdateListener),
        blockTheme,
        EditorState.readOnly.of(readOnly),
      ],
      parent: editorSequenceDiv,
    });
  });

  async function sequenceUpdateListener(viewUpdate: ViewUpdate): Promise<void> {
    const sequence = viewUpdate.state.doc.toString();
    sequenceDefinition = sequence;
    const tree = syntaxTree(viewUpdate.state);
    let output = await selectedOutputFormat?.toOutputFormat?.(sequence, phoenixContext, sequenceName);

    if (output !== undefined) {
      dispatch('templateChanged', { input: sequence, output });
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
      currentTree = tree;
    }
  }

  function showErrorPanel() {
    openLintPanel(editorSequenceView);
  }

  function formatDocument() {
    let format = newSequenceAdaptation.input.format;
    if (format !== undefined) {
      format(editorSequenceView);
    }
  }

  function saveSequenceTemplate() {
    effects.updateSequenceTemplate(sequenceDefinition, template, user);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (isSaveEvent(event)) {
      event.preventDefault();
      saveSequenceTemplate();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<CssGrid bind:columns={commandFormBuilderGrid} minHeight={'0'}>
  <CssGrid rows={editorHeights} minHeight={'0'}>
    <Panel>
      <svelte:fragment slot="header">
        <SectionTitle>{title}</SectionTitle>
        <div class="right">
          <button
            use:tooltip={{ content: 'Show Error Panel', placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            on:click={showErrorPanel}
          >
            Error Panel
          </button>

          <button
            use:tooltip={{ content: 'Format sequence whitespace', placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            on:click={formatDocument}
          >
            Format
          </button>

          <button
            use:tooltip={{ content: 'Download sequence template', placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            on:click={() => dispatch('download', { template })}
          >
            Download
          </button>

          <button
            use:tooltip={{ content: 'Save sequence template', placement: 'top' }}
            class="st-button icon-button secondary ellipsis"
            on:click|stopPropagation={saveSequenceTemplate}
            disabled={template === null}
          >
            Save
          </button>
        </div>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <div bind:this={editorSequenceDiv} />
      </svelte:fragment>
    </Panel>
  </CssGrid>

  {#if showCommandFormBuilder}
    <CssGridGutter track={1} type="column" />
    {#if commandDictionary !== null}
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

  .command-title {
    padding: 8px;
  }
</style>
