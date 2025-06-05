<script lang="ts">
  import { Collapsible } from '@nasa-jpl/stellar-svelte';
  import { ChevronRight, File, FileJson2, Folder, FolderOpen } from 'lucide-svelte';
  import { WorkspaceContentType } from '../enums/workspace';
  import type { WorkspaceTreeNode } from '../types/workspace-tree-view';
  import * as Sidebar from './sidebar-evaluation/index.js';

  export let treeNode: WorkspaceTreeNode;

  $: isFolder = treeNode.type === WorkspaceContentType.Directory && treeNode.contents && treeNode.contents.length > 0;
  $: isWorkspace = treeNode.type === WorkspaceContentType.Workspace;

  let isOpen = false;

  function getFileIcon(type: WorkspaceContentType) {
    switch (type) {
      case WorkspaceContentType.Sequence:
        return FileJson2;
      case WorkspaceContentType.Json:
        return FileJson2;
      default:
        return File;
    }
  }
</script>

{#if isWorkspace}
  <!-- Workspace root - just render its contents -->
  {#if treeNode.contents}
    {#each treeNode.contents as childNode (childNode.name)}
      <svelte:self treeNode={childNode} />
    {/each}
  {/if}
{:else if isFolder}
  <Sidebar.MenuItem>
    <Collapsible.Root bind:open={isOpen}>
      <Collapsible.Trigger>
        <Sidebar.MenuButton>
          <ChevronRight size={16} class={isOpen ? 'rotate-90' : ''} />
          {#if isOpen}
            <FolderOpen size={16} />
          {:else}
            <Folder size={16} />
          {/if}
          {treeNode.name}
        </Sidebar.MenuButton>
      </Collapsible.Trigger>
      <Collapsible.Content transitionConfig={{ duration: 0 }}>
        <Sidebar.MenuSub>
          {#if treeNode.contents}
            {#each treeNode.contents as childNode (childNode.name)}
              <svelte:self treeNode={childNode} />
            {/each}
          {/if}
        </Sidebar.MenuSub>
      </Collapsible.Content>
    </Collapsible.Root>
  </Sidebar.MenuItem>
{:else}
  <!-- File item -->
  <Sidebar.MenuItem>
    <Sidebar.MenuButton className="data-[active=true]:bg-transparent">
      <svelte:component this={getFileIcon(treeNode.type || WorkspaceContentType.Unknown)} size={16} />
      {treeNode.name}
    </Sidebar.MenuButton>
  </Sidebar.MenuItem>
{/if}
