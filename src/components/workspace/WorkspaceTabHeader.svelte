<svelte:options immutable={true} />

<script lang="ts">
  import { Button, DropdownMenu, Tooltip } from '@nasa-jpl/stellar-svelte';
  import { ArrowUpFromLine, Check, FilePlus, FolderPlus, Plus, RefreshCw } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { getTimeAgo } from '../../utilities/time';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let title: string;
  export let didWorkspaceUpdate: boolean;
  export let hasEditWorkspacePermission: boolean;
  export let lastRefreshTime: Date;

  const dispatch = createEventDispatcher<{
    importFile: void;
    newFolder: void;
    newSequence: void;
    refreshWorkspace: void;
  }>();

  function onRefreshWorkspace() {
    dispatch('refreshWorkspace');
  }

  function onNewSequence() {
    dispatch('newSequence');
  }

  function onNewFolder() {
    dispatch('newFolder');
  }

  function onImportFile() {
    dispatch('importFile');
  }
</script>

<div class="flex items-center justify-between gap-0 border-b border-border bg-background p-[6px]">
  <SectionTitle>{title}</SectionTitle>
  <div class="flex gap-1">
    <Tooltip.Root>
      <Tooltip.Trigger>
        {#if didWorkspaceUpdate}
          <Button variant="ghost" size="icon">
            <Check size={16} />
          </Button>
        {:else}
          <Button variant="ghost" size="icon" on:click={onRefreshWorkspace}>
            <RefreshCw size={16} />
          </Button>
        {/if}
      </Tooltip.Trigger>
      <Tooltip.Content>
        <div class="text-xs">Refresh (last refreshed {getTimeAgo(lastRefreshTime, new Date())})</div>
      </Tooltip.Content>
    </Tooltip.Root>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild let:builder>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button builders={[builder]} variant="ghost" size="icon" aria-label="New Workspace Item">
              <Plus size={16} />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <div class="text-xs">New Workspace Item</div>
          </Tooltip.Content>
        </Tooltip.Root>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item size="sm" on:click={onNewSequence}>
          <div
            class="flex cursor-pointer gap-2"
            use:permissionHandler={{
              hasPermission: hasEditWorkspacePermission,
              permissionError: 'You do not have permission to edit this workspace',
            }}
          >
            <FilePlus size={14} /> New File
          </div>
        </DropdownMenu.Item>
        <DropdownMenu.Item size="sm" on:click={onNewFolder}>
          <div
            class="flex cursor-pointer gap-2"
            use:permissionHandler={{
              hasPermission: hasEditWorkspacePermission,
              permissionError: 'You do not have permission to edit this workspace',
            }}
          >
            <FolderPlus size={14} /> New Folder
          </div>
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item size="sm" on:click={onImportFile}>
          <div
            class="flex cursor-pointer gap-2"
            use:permissionHandler={{
              hasPermission: hasEditWorkspacePermission,
              permissionError: 'You do not have permission to edit this workspace',
            }}
          >
            <ArrowUpFromLine size={14} />Upload File
          </div>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
</div>
