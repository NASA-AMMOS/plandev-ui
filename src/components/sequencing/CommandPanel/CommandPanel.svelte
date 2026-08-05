<svelte:options immutable={true} />

<script lang="ts">
  import { syntaxTree } from '@codemirror/language';
  import { StateEffect } from '@codemirror/state';
  import type { SyntaxNode, Tree } from '@lezer/common';
  import type { CommandDictionary, FswCommand, HwCommand } from '@nasa-jpl/plandev-ampcs';
  import type { CommandInfoMapper, PhoenixContext } from '@nasa-jpl/plandev-sequence-languages';
  import { EditorView } from 'codemirror';
  import { unquoteUnescape } from '../../../utilities/sequence-editor/sequence-utils';
  import Tab from '../../ui/Tabs/Tab.svelte';
  import TabPanel from '../../ui/Tabs/TabPanel.svelte';
  import Tabs from '../../ui/Tabs/Tabs.svelte';
  import CommandDictionaryComponent from './CommandDictionary.svelte';
  import SelectedCommand from './SelectedCommand.svelte';

  export let phoenixContext: PhoenixContext;
  export let commandInfoMapper: CommandInfoMapper;
  export let editorSequenceView: EditorView;
  export let readOnly: boolean = false;

  enum CommandPanelTabs {
    COMMAND = 'command',
    DEFINITION = 'definition',
  }

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
  const tabContextKey: string = 'command-panel';

  let commandPanelTabs: Tabs;
  let currentTree: Tree;
  let listenerAttached: boolean = false;
  let selectedCommandDefinition: (FswCommand | HwCommand) | null;
  let selectedNode: SyntaxNode | null = null;

  $: commandDictionary = phoenixContext?.commandDictionary ?? emptyCommandDictionary;

  $: commandNode = commandInfoMapper?.getContainingCommand?.(selectedNode) ?? null;
  $: commandNameNode = commandInfoMapper?.getNameNode?.(commandNode) ?? null;
  $: commandName =
    commandNameNode && unquoteUnescape(editorSequenceView.state.sliceDoc(commandNameNode.from, commandNameNode.to));
  $: timeTagNode = commandInfoMapper?.getTimeTagInfo?.(editorSequenceView, commandNode) ?? null;
  $: argInfoArray =
    commandInfoMapper?.getArgumentInfo?.(
      commandDef,
      editorSequenceView,
      commandInfoMapper?.getArgumentNodeContainer?.(commandNode),
      commandDef?.arguments,
      undefined,
      phoenixContext,
    ) ?? [];
  $: commandDef =
    commandInfoMapper?.getCommandDef?.(commandDictionary, phoenixContext?.librarySequences, commandName ?? '') ?? null;

  $: variablesInScope =
    commandInfoMapper?.getVariablesInScope?.(editorSequenceView, currentTree, commandNode?.from) ?? [];

  function formatTypeName(s: string) {
    // add spaces to CamelCase names, 'GroundEvent' -> 'Ground Event'
    return s.replace(/([^A-Z])(?=[A-Z])/g, '$1 ');
  }

  function onSelectCommandDefinition(event: CustomEvent<(FswCommand | HwCommand) | null>) {
    const { detail } = event;
    selectedCommandDefinition = detail;
    commandPanelTabs.selectTab(CommandPanelTabs.DEFINITION);
  }

  $: if (editorSequenceView && !listenerAttached) {
    listenerAttached = true;
    editorSequenceView.dispatch({
      effects: StateEffect.appendConfig.of([
        EditorView.updateListener.of(viewUpdate => {
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
        }),
      ]),
    });
  }
</script>

<div class="command-panel">
  <Tabs
    {tabContextKey}
    bind:this={commandPanelTabs}
    class="command-items-tabs"
    tabListClassName="command-items-tabs-list"
  >
    <svelte:fragment slot="tab-list">
      <Tab {tabContextKey} tabId={CommandPanelTabs.COMMAND} class="command-items-tab">
        {commandNode ? `Selected ${formatTypeName(commandNode.name)}` : 'Selected Command'}
      </Tab>
      <Tab {tabContextKey} tabId={CommandPanelTabs.DEFINITION} class="command-items-tab">Command Dictionary</Tab>
    </svelte:fragment>
    <TabPanel {tabContextKey} panelId={CommandPanelTabs.COMMAND}>
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
        {readOnly}
        {timeTagNode}
        on:selectCommandDefinition={onSelectCommandDefinition}
      />
    </TabPanel>
    <TabPanel {tabContextKey} panelId={CommandPanelTabs.DEFINITION}>
      <CommandDictionaryComponent
        {commandDictionary}
        {selectedCommandDefinition}
        on:selectCommandDefinition={onSelectCommandDefinition}
      />
    </TabPanel>
  </Tabs>
</div>

<style>
  .command-panel {
    display: flex;
    overflow: hidden;

    --tab-height: 47px;
    --tab-background-color: none;
    --tab-text-color: var(--st-gray-50);
    --tab-selected-background-color: white;
    --tab-list-background-color: none;
  }

  :global(.command-items-tabs-list) {
    border-bottom: 1px solid var(--st-gray-20);
  }

  :global(button.command-items-tab) {
    align-items: center;
    display: flex;
    font-size: 13px;
    justify-content: center;
    line-height: 24px;
    padding: 4px 8px;
    white-space: nowrap;
  }
</style>
