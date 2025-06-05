<svelte:options immutable={true} />

<script lang="ts">
  import CaretDownIcon from '@nasa-jpl/stellar/icons/caret_down.svg?component';
  import CaretRightIcon from '@nasa-jpl/stellar/icons/caret_right.svg?component';
  import { File, FileJson2 } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';

  export let isOpen: boolean | undefined = undefined;
  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let treeNode: WorkspaceTreeNode;
  export let treeNodePath: string;

  const dispatch = createEventDispatcher<{
    nodeClicked: {
      toggleState: boolean;
      treeNode: WorkspaceTreeNode;
      treeNodePath: string;
    };
    nodeRightClicked: {
      toggleState: boolean;
      treeNode: WorkspaceTreeNode;
      treeNodePath: string;
    };
  }>();

  let isSelected: boolean = false;

  $: isSelected = selectedTreeNodePath === treeNodePath;

  function onClick() {
    dispatch('nodeClicked', {
      toggleState: isOpen ?? false,
      treeNode,
      treeNodePath,
    });
  }
</script>

<div class="mb-1" class:selected={isSelected}>
  {#if treeNode.type === WorkspaceContentType.Workspace}
    <div>{treeNode.name}</div>
  {:else if treeNode.type === WorkspaceContentType.Directory}
    <button class="button icon grid grid-cols-[min-content_auto] justify-start" on:click={onClick}>
      {#if isOpen}
        <CaretDownIcon />
      {:else}
        <CaretRightIcon />
      {/if}
      <div>{treeNode.name}</div>
    </button>
  {:else}
    <button class="grid grid-cols-[min-content_auto] gap-1" on:click={onClick}>
      {#if treeNode.type === WorkspaceContentType.Sequence}
        <FileJson2 size="16" />
      {:else}
        <File size="16" />
      {/if}
      {treeNode.name}
    </button>
  {/if}
</div>
