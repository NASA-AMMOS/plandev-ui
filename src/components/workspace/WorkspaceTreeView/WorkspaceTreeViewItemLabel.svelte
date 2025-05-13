<svelte:options immutable={true} />

<script lang="ts">
  import CaretDownIcon from '@nasa-jpl/stellar/icons/caret_down.svg?component';
  import CaretRightIcon from '@nasa-jpl/stellar/icons/caret_right.svg?component';
  import { File, FileJson2 } from 'lucide-svelte';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';

  export let treeNode: WorkspaceTreeNode;
  export let isOpen: boolean | undefined = undefined;
</script>

<div class="mb-1">
  {#if treeNode.type === WorkspaceContentType.Workspace}
    <div>{treeNode.name}</div>
  {:else if treeNode.type === WorkspaceContentType.Directory}
    <button class="button icon grid grid-cols-[min-content_auto] justify-start" on:click>
      {#if isOpen}
        <CaretDownIcon />
      {:else}
        <CaretRightIcon />
      {/if}
      <div>{treeNode.name}</div>
    </button>
  {:else}
    <div class="grid grid-cols-[min-content_auto] gap-1">
      {#if treeNode.type === WorkspaceContentType.Sequence}
        <FileJson2 size="16" />
      {:else}
        <File size="16" />
      {/if}
      {treeNode.name}
    </div>
  {/if}
</div>
