<script lang="ts">
  import { Button, DropdownMenu, Tabs, Tooltip } from '@nasa-jpl/stellar-svelte';
  import {
    ArrowUpFromLine,
    Check,
    ChevronDown,
    Clapperboard,
    FilePlus,
    Files,
    FolderPlus,
    FolderTree,
    Plus,
    RefreshCw,
    Settings,
  } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { User } from '../../types/app';
  import type { WorkspaceTreeNode } from '../../types/workspace-tree-view';
  import { getTimeAgo } from '../../utilities/time';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import * as Sidebar from '../ui/Sidebar/index.js';
  import WorkspaceGridView from './WorkspaceGridView/WorkspaceGridView.svelte';
  import WorkspaceTreeView from './WorkspaceTreeView/WorkspaceTreeView.svelte';

  const dispatch = createEventDispatcher<{
    copyFileLocation: string;
    importFile: string;
    moveToWorkspace: string;
    newFolder: string;
    newSequence: string;
    refreshWorkspace: void;
    saveSequence: void;
  }>();

  export let selectedFilePath: string | null = null;
  export let user: User | null;
  export let isWorkspaceLoading: boolean = false;
  export let workspaceTree: WorkspaceTreeNode | null | undefined = undefined;

  let didWorkspaceUpdate: boolean = false;
  let lastRefreshTime: Date = new Date();

  $: workspaceTree && didUpdate(isWorkspaceLoading);

  async function didUpdate(loading: boolean) {
    if (loading === false) {
      didWorkspaceUpdate = true;
      lastRefreshTime = new Date();
      // introduce a fake timeout so the checkmark icon has some time to be visible
      await new Promise(resolve => setTimeout(resolve, 1000));
      didWorkspaceUpdate = false;
    }
  }

  function onNewFolder() {
    dispatch('newFolder', '');
  }

  function onNewSequence() {
    dispatch('newSequence', '');
  }

  function onImportFile() {
    dispatch('importFile', '');
  }

  function onRefreshWorkspace() {
    dispatch('refreshWorkspace');
  }
</script>

<Sidebar.Root className="h-full inset-x-0 border-none flex">
  <Tabs.Root value="files" orientation="vertical" class="flex h-full">
    <div class="flex h-full w-10 border-r border-border bg-muted">
      <Tabs.List class="flex h-auto w-full flex-col items-center justify-start gap-0">
        <Tooltip.Root>
          <Tooltip.Trigger asChild let:builder>
            <Tabs.Trigger value="files" class="flex h-10 w-10 items-center justify-center rounded-none shadow-none">
              <Button builders={[builder]} variant="ghost">
                <Files size={16} />
              </Button>
            </Tabs.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            <div>Files</div>
          </Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger asChild let:builder>
            <Tabs.Trigger value="grid" class="flex h-10 w-10 items-center justify-center rounded-none shadow-none">
              <Button builders={[builder]} variant="ghost">
                <FolderTree size={16} />
              </Button>
            </Tabs.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            <div>Grid</div>
          </Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger asChild let:builder>
            <Tabs.Trigger value="actions" class="flex h-10 w-10 items-center justify-center rounded-none shadow-none">
              <Button builders={[builder]} variant="ghost">
                <Clapperboard size={16} />
              </Button>
            </Tabs.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            <div>Actions</div>
          </Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger asChild let:builder>
            <Tabs.Trigger value="settings" class="flex h-10 w-10 items-center justify-center rounded-none shadow-none">
              <Button builders={[builder]} variant="ghost">
                <Settings size={16} />
              </Button>
            </Tabs.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>
            <div>Settings</div>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tabs.List>
    </div>
    <div class="flex h-full w-full flex-col">
      <Tabs.Content value="files" class="mt-0 h-full">
        <div class="grid h-full grid-rows-[min-content_auto]">
          <Sidebar.Header className="p-0">
            <div class="flex items-center justify-between gap-0 border-b border-border bg-background p-[8px]">
              <SectionTitle>Workspace Tree View</SectionTitle>
              <div class="flex gap-0">
                <Tooltip.Root>
                  <Tooltip.Trigger asChild let:builder>
                    {#if didWorkspaceUpdate}
                      <Button builders={[builder]} variant="ghost">
                        <Check size={16} />
                      </Button>
                    {:else}
                      <Button builders={[builder]} variant="ghost" on:click={onRefreshWorkspace}>
                        <RefreshCw size={16} />
                      </Button>
                    {/if}
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <div class="text-sm">Refresh (last {getTimeAgo(lastRefreshTime, new Date())})</div>
                  </Tooltip.Content>
                </Tooltip.Root>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild let:builder>
                    <Button builders={[builder]} variant="ghost" class="gap-0">
                      <Plus size={16} />
                      <ChevronDown size={16} />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content class="w-56">
                    <DropdownMenu.Item class="cursor-pointer gap-1" on:click={onNewSequence}>
                      <FilePlus size={16} /> New Sequence
                    </DropdownMenu.Item>
                    <DropdownMenu.Item class="cursor-pointer gap-1" on:click={onNewFolder}>
                      <FolderPlus size={16} /> New Folder
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item class="cursor-pointer gap-1" on:click={onImportFile}>
                      <ArrowUpFromLine size={16} />Import File
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </div>
            </div>
          </Sidebar.Header>
          <Sidebar.Content>
            <Sidebar.Group className="p-0 h-full">
              <Sidebar.GroupContent className="h-full">
                <Sidebar.Menu className="h-full">
                  {#if workspaceTree}
                    <WorkspaceTreeView
                      treeNode={workspaceTree}
                      selectedTreeNodePath={selectedFilePath}
                      on:nodeClicked
                      on:nodeDelete
                      on:nodeMove
                      on:nodeRename
                      on:newFolder
                      on:newSequence
                      on:importFile
                      on:copyFileLocation
                      on:moveToWorkspace
                    />
                  {:else}
                    <div class="p-2 text-sm text-muted-foreground">No workspace loaded</div>
                  {/if}
                </Sidebar.Menu>
              </Sidebar.GroupContent>
            </Sidebar.Group>
          </Sidebar.Content>
        </div>
      </Tabs.Content>
      <Tabs.Content value="grid" class="mt-0 h-full" style="min-height: 300px;">
        <div class="grid h-full grid-rows-[min-content_auto]">
          <Sidebar.Header className="p-0">
            <div class="flex items-center justify-between gap-0 border-b border-border bg-background p-[8px]">
              <SectionTitle>Workspace Table View</SectionTitle>
              <div class="flex gap-0">
                <Tooltip.Root>
                  <Tooltip.Trigger asChild let:builder>
                    {#if didWorkspaceUpdate}
                      <Button builders={[builder]} variant="ghost">
                        <Check size={16} />
                      </Button>
                    {:else}
                      <Button builders={[builder]} variant="ghost" on:click={onRefreshWorkspace}>
                        <RefreshCw size={16} />
                      </Button>
                    {/if}
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <div class="text-sm">Refresh (last {getTimeAgo(lastRefreshTime, new Date())})</div>
                  </Tooltip.Content>
                </Tooltip.Root>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild let:builder>
                    <Button builders={[builder]} variant="ghost" class="gap-0">
                      <Plus size={16} />
                      <ChevronDown size={16} />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content class="w-56">
                    <DropdownMenu.Item class="cursor-pointer gap-1" on:click={onNewSequence}>
                      <FilePlus size={16} /> New Sequence
                    </DropdownMenu.Item>
                    <DropdownMenu.Item class="cursor-pointer gap-1" on:click={onNewFolder}>
                      <FolderPlus size={16} /> New Folder
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item class="cursor-pointer gap-1">
                      <ArrowUpFromLine size={16} />Import File
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              </div>
            </div>
          </Sidebar.Header>
          <Sidebar.Content className="h-full">
            <Sidebar.Group className="p-0 h-full">
              <Sidebar.GroupContent className="h-full">
                <Sidebar.Menu className="h-full">
                  {#if workspaceTree}
                    <WorkspaceGridView
                      treeNode={workspaceTree}
                      selectedTreeNodePath={selectedFilePath}
                      {user}
                      on:nodeClicked
                      on:nodeDelete
                      on:nodeMove
                      on:nodeRename
                      on:newSequence
                      on:newFolder
                      on:importFile
                      on:copyFileLocation
                      on:moveToWorkspace
                    />
                  {:else}
                    <div class="p-2 text-sm text-muted-foreground">No workspace loaded</div>
                  {/if}
                </Sidebar.Menu>
              </Sidebar.GroupContent>
            </Sidebar.Group>
          </Sidebar.Content>
        </div>
      </Tabs.Content>
      <Tabs.Content value="actions" class="h-full" style="min-height: 300px;">
        <Sidebar.Menu className="h-full">
          <div class="flex h-full w-full items-center justify-center bg-muted">
            <div class="text-sm text-muted-foreground">Actions</div>
          </div>
        </Sidebar.Menu>
      </Tabs.Content>
      <Tabs.Content value="settings" class="h-full" style="min-height: 300px;">
        <Sidebar.Menu className="h-full">
          <div class="flex h-full w-full items-center justify-center bg-muted">
            <div class="text-sm text-muted-foreground">Settings</div>
          </div>
        </Sidebar.Menu>
      </Tabs.Content>
    </div>
  </Tabs.Root>
</Sidebar.Root>

<style>
  :global(.toggle-tree.disabled) {
    opacity: var(--st-button-disabled-opacity);
  }
</style>
