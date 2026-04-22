<svelte:options immutable={true} />

<script lang="ts">
  import { Button, DropdownMenu } from '@nasa-jpl/stellar-svelte';
  import { ArrowUpFromLine, Check, FilePlus, FolderPlus, Plus, RefreshCw } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { getTimeAgo } from '../../utilities/time';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import Tooltip from '../ui/Tooltip.svelte';
  import PanelHeader from './PanelHeader.svelte';

  export let title: string;
  export let didWorkspaceUpdate: boolean;
  export let hasEditWorkspacePermission: boolean;
  export let lastRefreshTime: Date;

  const dispatch = createEventDispatcher<{
    importFile: void;
    newFile: void;
    newFolder: void;
    refreshWorkspace: void;
  }>();

  function onRefreshWorkspace() {
    dispatch('refreshWorkspace');
  }

  function onNewFile() {
    dispatch('newFile');
  }

  function onNewFolder() {
    dispatch('newFolder');
  }

  function onImportFile() {
    dispatch('importFile');
  }
</script>

<PanelHeader>
  <SectionTitle>{title}</SectionTitle>
  <div class="flex gap-1.5">
    <Tooltip content={`Refresh (last refreshed ${getTimeAgo(lastRefreshTime, new Date())})`}>
      {#if didWorkspaceUpdate}
        <Button variant="ghost" size="icon" class="pointer-events-none">
          <Check size={16} />
        </Button>
      {:else}
        <Button variant="outline" size="icon" on:click={onRefreshWorkspace} aria-label="Refresh Workspace">
          <RefreshCw size={16} />
        </Button>
      {/if}
    </Tooltip>
    <DropdownMenu.Root>
      <Tooltip content="New Workspace Item">
        <DropdownMenu.Trigger asChild let:builder>
          <Button builders={[builder]} variant="outline" size="icon" aria-label="New Workspace Item">
            <Plus size={16} />
          </Button>
        </DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Content data-testid="workspace-header-menu">
        <div
          role="button"
          tabindex={0}
          on:keypress
          on:keydown
          on:keyup
          on:click={onNewFile}
          use:permissionHandler={{
            hasPermission: hasEditWorkspacePermission,
            permissionError: 'You do not have permission to edit this workspace',
          }}
        >
          <DropdownMenu.Item size="sm">
            <div class="flex gap-2">
              <FilePlus size={14} /> New File
            </div>
          </DropdownMenu.Item>
        </div>
        <div
          role="button"
          tabindex={0}
          on:keypress
          on:keydown
          on:keyup
          on:click={onNewFolder}
          use:permissionHandler={{
            hasPermission: hasEditWorkspacePermission,
            permissionError: 'You do not have permission to edit this workspace',
          }}
        >
          <DropdownMenu.Item size="sm">
            <div class="flex gap-2">
              <FolderPlus size={14} /> New Folder
            </div>
          </DropdownMenu.Item>
        </div>
        <DropdownMenu.Separator />
        <div
          role="button"
          tabindex={0}
          on:keypress
          on:keydown
          on:keyup
          on:click={onImportFile}
          use:permissionHandler={{
            hasPermission: hasEditWorkspacePermission,
            permissionError: 'You do not have permission to edit this workspace',
          }}
        >
          <DropdownMenu.Item size="sm">
            <div class="flex gap-2">
              <ArrowUpFromLine size={14} />Upload File
            </div>
          </DropdownMenu.Item>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>
</PanelHeader>
