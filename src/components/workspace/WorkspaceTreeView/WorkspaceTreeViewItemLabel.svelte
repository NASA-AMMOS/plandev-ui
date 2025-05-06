<svelte:options immutable={true} />

<script lang="ts">
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';

  export let treeNode: WorkspaceTreeNode;
</script>

<div>
  {treeNode.label ?? treeNode.id}
</div>
