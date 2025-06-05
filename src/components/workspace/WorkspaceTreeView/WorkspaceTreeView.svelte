<svelte:options immutable={true} />

<script lang="ts">
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import WorkspaceTreeViewParentItem from './WorkspaceTreeViewParentItem.svelte';

  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let treeNode: WorkspaceTreeNode | null | undefined = undefined;
</script>

<div>
  {#if treeNode}
    <WorkspaceTreeViewParentItem
      {treeNode}
      {selectedTreeNodePath}
      treeNodePath={`${treeNode.name}`}
      on:nodeClicked={event => console.log(event.detail.treeNode)}
      on:nodeRightClicked
    />
  {:else}
    No tree is present
  {/if}
</div>
