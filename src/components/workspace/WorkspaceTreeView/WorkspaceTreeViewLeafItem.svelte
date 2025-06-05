<svelte:options immutable={true} />

<script lang="ts">
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import WorkspaceTreeViewItemLabel from './WorkspaceTreeViewItemLabel.svelte';

  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let treeNode: WorkspaceTreeNode;
  export let treeNodePath: string;
</script>

<div>
  <WorkspaceTreeViewItemLabel {selectedTreeNodePath} {treeNode} {treeNodePath} on:nodeClicked on:nodeRightClicked />
</div>
