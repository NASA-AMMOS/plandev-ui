<svelte:options immutable={true} />

<script lang="ts">
  import { syntaxTree } from '@codemirror/language';
  import { StateEffect } from '@codemirror/state';
  import type { SyntaxNode, Tree } from '@lezer/common';
  import type { CommandDictionary, FswCommand, HwCommand } from '@nasa-jpl/aerie-ampcs';
  import type { ArgTextDef, CommandInfoMapper, PhoenixContext, TimeTagInfo } from '@nasa-jpl/aerie-sequence-languages';
  import { EditorView } from 'codemirror';
  import type { WorkspaceFileMetadata } from '../../types/workspace-tree-view';
  import { unquoteUnescape } from '../../utilities/sequence-editor/sequence-utils';
  import CommandDictionaryComponent from '../sequencing/CommandPanel/CommandDictionary.svelte';
  import SelectedCommand from '../sequencing/CommandPanel/SelectedCommand.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';
  import PanelHeader from './PanelHeader.svelte';
  import WorkspaceMetadataPanel from './WorkspaceMetadataPanel.svelte';

  export let activeTab: string = 'metadata';
  export let commandNodeName: string | null = null;
  export let editorSequenceView: EditorView | null = null;
  export let commandInfoMapper: CommandInfoMapper | null = null;
  export let filePath: string | null = null;
  export let fileMetadata: WorkspaceFileMetadata | null = null;
  export let hasEditPermission: boolean = false;
  export let isSequenceFile: boolean = false;
  export let phoenixContext: PhoenixContext;

  const emptyCommandDictionary: CommandDictionary = {
    enumMap: {},
    enums: [],
    fswCommandMap: {},
    fswCommands: [],
    header: {
      mission_name: '',
      schema_version: '',
      spacecraft_ids: [],
      version: '',
    },
    hwCommandMap: {},
    hwCommands: [],
    id: '',
    path: null,
  };

  let argInfoArray: ArgTextDef[] = [];
  let commandDef: FswCommand | null = null;
  let commandDictionary: CommandDictionary = emptyCommandDictionary;
  let commandName: string | null = null;
  let commandNameNode: SyntaxNode | null = null;
  let commandNode: SyntaxNode | null = null;
  let currentTree: Tree;
  let listenerAttached: boolean = false;
  let selectedCommandDefinition: (FswCommand | HwCommand) | null = null;
  let selectedNode: SyntaxNode | null = null;
  let timeTagNode: TimeTagInfo | null = null;
  let variablesInScope: string[] = [];

  $: commandDictionary = phoenixContext?.commandDictionary ?? emptyCommandDictionary;

  $: commandNode = commandInfoMapper?.getContainingCommand?.(selectedNode) ?? null;
  $: commandNameNode = commandInfoMapper?.getNameNode?.(commandNode) ?? null;
  $: commandName =
    commandNameNode &&
    editorSequenceView &&
    unquoteUnescape(editorSequenceView.state.sliceDoc(commandNameNode.from, commandNameNode.to));
  $: timeTagNode = editorSequenceView ? commandInfoMapper?.getTimeTagInfo?.(editorSequenceView, commandNode) : null;
  $: argInfoArray = editorSequenceView
    ? (commandInfoMapper?.getArgumentInfo?.(
        commandDef,
        editorSequenceView,
        commandInfoMapper?.getArgumentNodeContainer?.(commandNode),
        commandDef?.arguments,
        undefined,
        phoenixContext,
      ) ?? [])
    : [];
  $: commandDef =
    commandInfoMapper?.getCommandDef?.(commandDictionary, phoenixContext?.librarySequences, commandName ?? '') ?? null;
  $: variablesInScope =
    editorSequenceView && currentTree
      ? (commandInfoMapper?.getVariablesInScope?.(editorSequenceView, currentTree, commandNode?.from) ?? [])
      : [];

  // Expose commandNode name to parent for icon rail tooltip
  $: commandNodeName = commandNode?.name ?? null;

  function formatTypeName(s: string) {
    return s.replace(/([^A-Z])(?=[A-Z])/g, '$1 ');
  }

  function onSelectCommandDefinition(event: CustomEvent<(FswCommand | HwCommand) | null>) {
    const { detail } = event;
    selectedCommandDefinition = detail;
    activeTab = 'dictionary';
  }

  // Attach editor listener for tracking selected command
  $: if (editorSequenceView && isSequenceFile && !listenerAttached) {
    listenerAttached = true;
    editorSequenceView.dispatch({
      effects: StateEffect.appendConfig.of([
        EditorView.updateListener.of(viewUpdate => {
          const tree = syntaxTree(viewUpdate.state);
          const selectionLine = viewUpdate.state.doc.lineAt(viewUpdate.state.selection.asSingle().main.from);
          const leadingWhiteSpaceLength = selectionLine.text.length - selectionLine.text.trimStart().length;
          const updatedSelectionNode = tree.resolveInner(selectionLine.from + leadingWhiteSpaceLength, 1);
          if (selectedNode !== updatedSelectionNode) {
            selectedNode = updatedSelectionNode;
            currentTree = tree;
          }
        }),
      ]),
    });
  }

  // Reset listener when editor view changes (file switch)
  $: if (!editorSequenceView) {
    listenerAttached = false;
    selectedNode = null;
  }
</script>

<div class="h-full w-full overflow-auto">
  {#if activeTab === 'command' && isSequenceFile && editorSequenceView}
    {#if phoenixContext.commandDictionary !== null && commandInfoMapper}
      <div class="grid h-full grid-rows-[min-content_auto]">
        <Sidebar.Header className="p-0">
          <PanelHeader>
            <SectionTitle>
              {commandNode ? `Selected ${formatTypeName(commandNode.name)}` : 'Selected Command'}
            </SectionTitle>
          </PanelHeader>
        </Sidebar.Header>
        <Sidebar.Content className="h-full overflow-auto">
          <SelectedCommand
            {commandDef}
            {commandName}
            {commandNode}
            {argInfoArray}
            {variablesInScope}
            {commandNameNode}
            {commandDictionary}
            {commandInfoMapper}
            {editorSequenceView}
            {timeTagNode}
            on:selectCommandDefinition={onSelectCommandDefinition}
          />
        </Sidebar.Content>
      </div>
    {:else}
      <Panel overflowYBody="hidden" padBody>
        <svelte:fragment slot="header">
          <SectionTitle><span class="p-2">Selected Command</span></SectionTitle>
        </svelte:fragment>
        <svelte:fragment slot="body">
          <div class="p-2 text-muted-foreground">
            {#if phoenixContext.commandDictionary == null}
              Select a parcel with a command dictionary to enable the Selected Command panel.
            {:else}
              Select a parcel with an adaptation containing a command mapping to enable the Selected Command panel.
            {/if}
          </div>
        </svelte:fragment>
      </Panel>
    {/if}
  {:else if activeTab === 'dictionary' && isSequenceFile}
    {#if phoenixContext.commandDictionary !== null}
      <div class="grid h-full grid-rows-[min-content_auto]">
        <Sidebar.Header className="p-0">
          <PanelHeader>
            <SectionTitle>Command Dictionary</SectionTitle>
          </PanelHeader>
        </Sidebar.Header>
        <Sidebar.Content className="h-full overflow-auto">
          <CommandDictionaryComponent
            {commandDictionary}
            {selectedCommandDefinition}
            on:selectCommandDefinition={onSelectCommandDefinition}
          />
        </Sidebar.Content>
      </div>
    {:else}
      <Panel overflowYBody="hidden" padBody>
        <svelte:fragment slot="header">
          <SectionTitle><span class="p-2">Command Dictionary</span></SectionTitle>
        </svelte:fragment>
        <svelte:fragment slot="body">
          <div class="p-2 text-muted-foreground">Select a parcel to enable the Command Dictionary panel.</div>
        </svelte:fragment>
      </Panel>
    {/if}
  {:else if activeTab === 'metadata'}
    <WorkspaceMetadataPanel {filePath} {fileMetadata} {hasEditPermission} on:updateUserMetadata />
  {/if}
</div>
