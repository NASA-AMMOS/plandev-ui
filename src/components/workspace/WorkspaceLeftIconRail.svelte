<svelte:options immutable={true} />

<script lang="ts">
  import { Button, Tooltip } from '@nasa-jpl/stellar-svelte';
  import { Clapperboard, Files, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';

  const dispatch = createEventDispatcher<{
    actionsClick: void;
  }>();

  export let activeTab: string = 'files';
  export let panelOpen: boolean = true;

  function handleTabClick(tab: string) {
    if (activeTab === tab && panelOpen) {
      panelOpen = !panelOpen;
    } else {
      activeTab = tab;
      panelOpen = true;
    }
  }
</script>

<div class="flex h-full w-[45px] flex-shrink-0 flex-col justify-between border-r border-border bg-muted">
  <div class="flex h-auto w-full flex-col items-center justify-start gap-0 p-0" role="tablist">
    <Sidebar.MenuButton
      className="flex h-[48px] w-full items-center justify-center rounded-none shadow-none hover:bg-transparent"
      isActive={activeTab === 'files' && panelOpen}
      tooltipContent="Files"
      on:click={() => handleTabClick('files')}
    >
      <Files size={16} />
    </Sidebar.MenuButton>
    <Tooltip.Root>
      <Tooltip.Trigger asChild let:builder>
        <Button
          class="h-[48px] w-full rounded-none ring-inset hover:bg-[var(--sidebar-accent)]"
          builders={[builder]}
          variant="ghost"
          aria-label="Actions"
          on:click={() => dispatch('actionsClick')}
        >
          <Clapperboard size={16} />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content sideOffset={8}>
        <div>Actions</div>
      </Tooltip.Content>
    </Tooltip.Root>
    <Sidebar.MenuButton
      className="flex h-[48px] w-full items-center justify-center rounded-none shadow-none hover:bg-transparent"
      isActive={activeTab === 'settings' && panelOpen}
      tooltipContent="Settings"
      on:click={() => handleTabClick('settings')}
    >
      <Settings size={16} />
    </Sidebar.MenuButton>
  </div>
  <div class="flex w-full flex-col items-center pb-2">
    <Tooltip.Root>
      <Tooltip.Trigger asChild let:builder>
        <Button
          class="h-[32px] w-[32px] rounded-md p-0 ring-inset hover:bg-[var(--sidebar-accent)]"
          builders={[builder]}
          variant="ghost"
          aria-label={panelOpen ? 'Collapse panel' : 'Expand panel'}
          on:click={() => (panelOpen = !panelOpen)}
        >
          {#if panelOpen}
            <PanelLeftClose size={16} />
          {:else}
            <PanelLeftOpen size={16} />
          {/if}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content sideOffset={8}>
        <div>{panelOpen ? 'Collapse panel' : 'Expand panel'}</div>
      </Tooltip.Content>
    </Tooltip.Root>
  </div>
</div>
