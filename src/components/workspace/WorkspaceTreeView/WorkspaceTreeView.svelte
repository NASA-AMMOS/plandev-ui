<svelte:options immutable={true} />

<script lang="ts">
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import WorkspaceTreeViewNode from './WorkspaceTreeViewNode.svelte';

  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let treeNode: WorkspaceTreeNode | null | undefined = undefined;
</script>

<div>
  {#if treeNode && treeNode.contents}
    <!-- Workspace root - just render its contents -->
    {#each treeNode.contents as treeNodeChild (treeNodeChild.name)}
      <WorkspaceTreeViewNode
        {selectedTreeNodePath}
        treeNode={treeNodeChild}
        treeNodePath={treeNodeChild.name}
        on:nodeClicked
        on:nodeRightClicked
      />
    {/each}
  {:else}
    <div class="p-2 text-sm text-muted-foreground">No workspace loaded</div>
  {/if}
</div>
