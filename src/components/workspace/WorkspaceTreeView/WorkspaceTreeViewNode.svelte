<script lang="ts">
  import { Collapsible } from '@nasa-jpl/stellar-svelte';
  import { ChevronRight, Folder, FolderOpen } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view.js';
  import * as Sidebar from '../../ui/Sidebar/index.js';
  import WorkspaceTreeViewIcon from './WorkspaceTreeViewIcon.svelte';

  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let treeNode: WorkspaceTreeNode;
  export let treeNodePath: string = '';
  export let depth: number = 0;

  type NodeClickEvent = {
    toggleState: boolean;
    treeNode: WorkspaceTreeNode;
    treeNodePath: string;
  };

  const dispatch = createEventDispatcher<{
    nodeClicked: NodeClickEvent;
    nodeRightClicked: NodeClickEvent;
  }>();

  let isFolder: boolean = false;
  let isOpen: boolean = false;

  $: isFolder = treeNode.type === WorkspaceContentType.Directory && (treeNode.contents?.length ?? 0) > 0;

  $: if (selectedTreeNodePath) {
    const pathRegex = new RegExp(`^${treeNodePath}`);
    const isOnPath = pathRegex.test(selectedTreeNodePath);

    if (isOnPath) {
      isOpen = true;
    }
  }

  function onNodeClicked() {
    dispatch('nodeClicked', {
      toggleState: isOpen,
      treeNode,
      treeNodePath,
    });
  }

  function onNodeRightClicked() {
    dispatch('nodeRightClicked', {
      toggleState: isOpen,
      treeNode,
      treeNodePath,
    });
  }
</script>

{#if isFolder}
  <Sidebar.MenuItem>
    <Collapsible.Root bind:open={isOpen}>
      <Collapsible.Trigger class="w-full">
        {#if depth > 0}
          <Sidebar.MenuSubButton
            isActive={selectedTreeNodePath === treeNodePath}
            {depth}
            on:click={onNodeClicked}
            on:contextmenu={onNodeRightClicked}
          >
            <ChevronRight size={16} class={isOpen ? 'rotate-90' : ''} />
            {#if isOpen}
              <FolderOpen size={16} />
            {:else}
              <Folder size={16} />
            {/if}
            <span class="truncate">{treeNode.name}</span>
          </Sidebar.MenuSubButton>
        {:else}
          <Sidebar.MenuButton
            isActive={selectedTreeNodePath === treeNodePath}
            on:click={onNodeClicked}
            on:contextmenu={onNodeRightClicked}
          >
            <ChevronRight size={16} class={isOpen ? 'rotate-90' : ''} />
            {#if isOpen}
              <FolderOpen size={16} />
            {:else}
              <Folder size={16} />
            {/if}
            <span class="truncate">{treeNode.name}</span>
          </Sidebar.MenuButton>
        {/if}
      </Collapsible.Trigger>
      <Collapsible.Content transitionConfig={{ duration: 0 }}>
        <Sidebar.MenuSub {depth}>
          {#if treeNode.contents}
            {#each treeNode.contents as treeNodeChild (treeNodeChild.name)}
              <svelte:self
                {selectedTreeNodePath}
                treeNode={treeNodeChild}
                treeNodePath={`${treeNodePath}/${treeNodeChild.name}`}
                depth={depth + 1}
                on:nodeClicked
                on:nodeRightClicked
              />
            {/each}
          {/if}
        </Sidebar.MenuSub>
      </Collapsible.Content>
    </Collapsible.Root>
  </Sidebar.MenuItem>
{:else}
  <!-- File item -->
  <Sidebar.MenuItem>
    <div class="w-full">
      {#if depth > 0}
        <Sidebar.MenuSubButton
          isActive={selectedTreeNodePath === treeNodePath}
          {depth}
          on:click={onNodeClicked}
          on:contextmenu={onNodeRightClicked}
        >
          <WorkspaceTreeViewIcon {treeNode} />
          <span class="truncate">{treeNode.name}</span>
        </Sidebar.MenuSubButton>
      {:else}
        <Sidebar.MenuButton
          isActive={selectedTreeNodePath === treeNodePath}
          on:click={onNodeClicked}
          on:contextmenu={onNodeRightClicked}
        >
          <WorkspaceTreeViewIcon {treeNode} />
          <span class="truncate">{treeNode.name}</span>
        </Sidebar.MenuButton>
      {/if}
    </div>
  </Sidebar.MenuItem>
{/if}
