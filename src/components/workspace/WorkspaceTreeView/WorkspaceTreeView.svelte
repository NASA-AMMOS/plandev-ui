<svelte:options immutable={true} />

<script lang="ts">
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import WorkspaceTreeViewNode from './WorkspaceTreeViewNode.svelte';

  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let showFiles: boolean = true;
  export let showRootNode: boolean = false;
  export let treeNode: WorkspaceTreeNode | null | undefined = undefined;
</script>

<div class="h-auto pt-1">
  {#if showRootNode && treeNode}
    <WorkspaceTreeViewNode {selectedTreeNodePath} {showFiles} {treeNode} treeNodePath={treeNode.name} on:nodeClicked />
  {:else if treeNode && treeNode.contents && treeNode.contents.length > 0}
    <!-- Workspace root - just render its contents -->
    {#each treeNode.contents as treeNodeChild (treeNodeChild.name)}
      {#if (!showFiles && treeNodeChild.type === WorkspaceContentType.Directory) || showFiles}
        <WorkspaceTreeViewNode
          {selectedTreeNodePath}
          {showFiles}
          treeNode={treeNodeChild}
          treeNodePath={treeNodeChild.name}
          on:nodeClicked
        />
      {/if}
    {/each}
  {:else if treeNode && treeNode.contents?.length === 0}
    <div class="p-2 text-sm text-muted-foreground">Workspace is empty</div>
  {:else}
    <div class="p-2 text-sm text-muted-foreground">No workspace loaded</div>
  {/if}
</div>
