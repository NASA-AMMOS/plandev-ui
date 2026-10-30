<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { BookA, History, Info, PanelRightClose, PanelRightOpen, TextCursorInput } from 'lucide-svelte';
  import { WorkspaceRightPanelTab } from '../../enums/workspace.js';
  import * as Sidebar from '../ui/Sidebar/index.js';
  import Tooltip from '../ui/Tooltip.svelte';

  export let activeTab: WorkspaceRightPanelTab = WorkspaceRightPanelTab.METADATA;
  export let commandNodeName: string | null = null;
  export let isSequenceFile: boolean = false;
  export let panelOpen: boolean = true;

  function formatTypeName(s: string) {
    return s.replace(/([^A-Z])(?=[A-Z])/g, '$1 ');
  }

  function togglePanel(nextTab: WorkspaceRightPanelTab) {
    if (activeTab === nextTab && panelOpen) {
      panelOpen = false;
    } else {
      activeTab = nextTab;
      panelOpen = true;
    }
  }
</script>

<div class="flex h-full w-[45px] flex-shrink-0 flex-col justify-between border-l border-border bg-muted">
  <div class="flex h-auto w-full flex-col items-center justify-start gap-0 p-0" role="tablist">
    <Sidebar.MenuButton
      className="flex h-[48px] w-full items-center justify-center rounded-none shadow-none hover:bg-transparent"
      isActive={activeTab === WorkspaceRightPanelTab.METADATA && panelOpen}
      tooltipContent="Metadata"
      on:click={() => togglePanel(WorkspaceRightPanelTab.METADATA)}
    >
      <Info size={16} />
    </Sidebar.MenuButton>
    <Sidebar.MenuButton
      className="flex h-[48px] w-full items-center justify-center rounded-none shadow-none hover:bg-transparent"
      isActive={activeTab === WorkspaceRightPanelTab.REVISIONS && panelOpen}
      tooltipContent="Revisions"
      on:click={() => togglePanel(WorkspaceRightPanelTab.REVISIONS)}
    >
      <History size={16} />
    </Sidebar.MenuButton>
    {#if isSequenceFile}
      <Sidebar.MenuButton
        className="flex h-[48px] w-full items-center justify-center rounded-none shadow-none hover:bg-transparent"
        isActive={activeTab === WorkspaceRightPanelTab.COMMAND && panelOpen}
        tooltipContent={commandNodeName ? `Selected ${formatTypeName(commandNodeName)}` : 'Selected Command'}
        on:click={() => togglePanel(WorkspaceRightPanelTab.COMMAND)}
      >
        <TextCursorInput size={16} />
      </Sidebar.MenuButton>
      <Sidebar.MenuButton
        className="flex h-[48px] w-full items-center justify-center rounded-none shadow-none hover:bg-transparent"
        isActive={activeTab === WorkspaceRightPanelTab.DICTIONARY && panelOpen}
        tooltipContent="Command Dictionary"
        on:click={() => togglePanel(WorkspaceRightPanelTab.DICTIONARY)}
      >
        <BookA size={16} />
      </Sidebar.MenuButton>
    {/if}
  </div>
  <div class="flex w-full flex-col items-center pb-2">
    <Tooltip
      content={panelOpen ? 'Collapse panel' : 'Expand panel'}
      openDelay={0}
      closeDelay={0}
      side="right"
      sideOffset={8}
    >
      <Button
        class="h-[32px] w-[32px] rounded-md p-0 ring-inset hover:bg-[var(--sidebar-accent)]"
        variant="ghost"
        aria-label={panelOpen ? 'Collapse panel' : 'Expand panel'}
        on:click={() => (panelOpen = !panelOpen)}
      >
        {#if panelOpen}
          <PanelRightClose size={16} />
        {:else}
          <PanelRightOpen size={16} />
        {/if}
      </Button>
    </Tooltip>
  </div>
</div>
