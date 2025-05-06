<svelte:options immutable={true} />

<script lang="ts">
  import type { TreeNode } from '../../../types/tree-view';

  export let treeNode: TreeNode;
  export let treeNodeIconComponent: any = undefined;
</script>

<div>
  {#if treeNodeIconComponent != null}
    <svelte:component this={treeNodeIconComponent} {treeNode} />
  {/if}
  {#if $$slots.icon}
    <slot name="icon" />
  {/if}
  {treeNode.label ?? treeNode.id}
</div>
