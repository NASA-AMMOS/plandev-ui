<svelte:options immutable={true} />

<script lang="ts">
  import type { SyntaxNode } from '@lezer/common';
  import type { CommandDictionary, FswCommand, HwCommand } from '@nasa-jpl/aerie-ampcs';
  import type { EditorView } from 'codemirror';
  import type { ArgTextDef, TimeTagInfo } from '../../../types/sequencing';
  import type { CommandInfoMapper } from '../../../utilities/sequence-editor/command-info-mapper';
  import Tab from '../../ui/Tabs/Tab.svelte';
  import TabPanel from '../../ui/Tabs/TabPanel.svelte';
  import Tabs from '../../ui/Tabs/Tabs.svelte';
  import CommandDictionaryComponent from './CommandDictionary.svelte';
  import SelectedCommand from './SelectedCommand.svelte';

  export let argInfoArray: ArgTextDef[] = [];
  export let commandDef: FswCommand | null = null;
  export let commandDictionary: CommandDictionary;
  export let commandInfoMapper: CommandInfoMapper;
  export let commandName: string | null = null;
  export let commandNameNode: SyntaxNode | null = null;
  export let commandNode: SyntaxNode | null = null;
  export let editorSequenceView: EditorView;
  export let timeTagNode: TimeTagInfo | null = null;
  export let variablesInScope: string[] = [];

  enum CommandPanelTabs {
    COMMAND = 'command',
    DEFINITION = 'definition',
  }

  const tabContextKey: string = 'command-panel';

  let commandPanelTabs: Tabs;
  let selectedCommandDefinition: (FswCommand | HwCommand) | null;

  function formatTypeName(s: string) {
    // add spaces to CamelCase names, 'GroundEvent' -> 'Ground Event'
    return s.replace(/([^A-Z])(?=[A-Z])/g, '$1 ');
  }

  function onSelectCommandDefinition(event: CustomEvent<(FswCommand | HwCommand) | null>) {
    const { detail } = event;
    selectedCommandDefinition = detail;
    commandPanelTabs.selectTab(CommandPanelTabs.DEFINITION);
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

  :global(.command-items-tab) {
    align-items: center;
    display: flex;
    font-size: 13px;
    gap: 5px;
    height: 24px;
    justify-content: center;
    line-height: 24px;
    padding: 4px 8px 4px 0px;
    white-space: nowrap;
  }
</style>
