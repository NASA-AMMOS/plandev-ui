<script lang="ts">
  import { Button, DropdownMenu, Tooltip } from '@nasa-jpl/stellar-svelte';
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import SettingsIcon from '@nasa-jpl/stellar/icons/settings.svg?component';
  import {
    ArrowUpFromLine,
    ChevronDown,
    Clapperboard,
    FilePlus,
    FolderPlus,
    FolderTree,
    RefreshCcw,
  } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { User } from '../../types/app';
  import type { WorkspaceTreeNode } from '../../types/workspace-tree-view';
  import { classNames } from '../../utilities/generic';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';
  import WorkspaceGridView from './WorkspaceGridView/WorkspaceGridView.svelte';
  import WorkspaceTreeView from './WorkspaceTreeView/WorkspaceTreeView.svelte';

  const dispatch = createEventDispatcher<{
    newFolder: void;
    newSequence: void;
    refreshWorkspace: void;
    saveSequence: void;
  }>();

  export let selectedSequencePath: string | null = null;
  export let user: User | null;
  export let workspaceTree: WorkspaceTreeNode | null | undefined = undefined;

  let isTreeViewActive: boolean = true;

  function toggleTreeView() {
    isTreeViewActive = !isTreeViewActive;
  }

  function onNewFolder() {
    dispatch('newFolder');
  }

  function onNewSequence() {
    dispatch('newSequence');
  }

  function onRefreshWorkspace() {
    dispatch('refreshWorkspace');
  }

  function onSave() {
    dispatch('saveSequence');
  }
</script>

<Sidebar.Root className="h-full inset-x-0 border-none">
  <Sidebar.Header>
    <div class="flex items-center gap-2">
      <SectionTitle>Workspace</SectionTitle>
      <div class="flex gap-1">
        <Button variant="outline" class="gap-1">
          <Clapperboard size={16} />
          Actions
        </Button>
        <Button variant="outline" class="gap-1" on:click={onSave}>Save</Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild let:builder>
            <Button builders={[builder]} variant="outline" class="gap-1">
              <PlusIcon size={16} />
              <ChevronDown size={16} />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class="w-56">
            <DropdownMenu.Item class="cursor-pointer gap-1" on:click={onNewSequence}>
              <FilePlus size={16} />New Sequence
            </DropdownMenu.Item>
            <DropdownMenu.Item class="cursor-pointer gap-1" on:click={onNewFolder}>
              <FolderPlus size={16} />New Folder
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item class="cursor-pointer gap-1"><ArrowUpFromLine size={16} />Import File</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <Tooltip.Root>
          <Tooltip.Trigger asChild let:builder>
            <Button builders={[builder]} variant="outline" on:click={toggleTreeView}>
              <FolderTree
                class={classNames('toggle-tree', {
                  disabled: !isTreeViewActive,
                })}
                size={16}
              />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            {#if isTreeViewActive}
              <div>Disable Page Tree View</div>
            {:else}
              <div>Enable Page Tree View</div>
            {/if}
          </Tooltip.Content>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger asChild let:builder>
            <Button builders={[builder]} variant="outline" on:click={onRefreshWorkspace}>
              <RefreshCcw size={16} />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <div>Refresh File Explorer</div>
          </Tooltip.Content>
        </Tooltip.Root>
        <Button variant="outline">
          <SettingsIcon size={16} />
        </Button>
      </div>
    </div>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>Files</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#if workspaceTree}
            {#if isTreeViewActive}
              <WorkspaceTreeView
                treeNode={workspaceTree}
                selectedTreeNodePath={selectedSequencePath}
                on:nodeClicked
                on:nodeRightClicked
              />
            {:else}
              <WorkspaceGridView
                treeNode={workspaceTree}
                selectedTreeNodePath={selectedSequencePath}
                {user}
                on:nodeClicked
                on:nodeRightClicked
              />
            {/if}
          {:else}
            <div class="p-2 text-sm text-muted-foreground">No workspace loaded</div>
          {/if}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</Sidebar.Root>

<style>
  :global(.toggle-tree.disabled) {
    opacity: var(--st-button-disabled-opacity);
  }
</style>
