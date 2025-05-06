<svelte:options immutable={true} />

<script lang="ts">
  type NodeData = $$Generic<TNodeData>;

  interface $$Events extends ComponentEvents<SvelteComponent> {
    nodeClicked: CustomEvent<NodeData>;
    nodeOpened: CustomEvent<NodeData>;
    nodeRightClicked: CustomEvent<NodeData>;
  }

  import { type ComponentEvents, createEventDispatcher, SvelteComponent } from 'svelte';
  import type { Dispatcher } from '../../../types/component';
  import type { TreeNode } from '../../../types/tree-view';
  import TreeViewParentItem from './TreeViewParentItem.svelte';

  export let treeNode: TreeNode | undefined;
  export let treeNodeIconComponent: any;

  const dispatch = createEventDispatcher<Dispatcher<$$Events>>();
</script>

<div>
  {#if treeNode}
    <TreeViewParentItem {treeNode} {treeNodeIconComponent} />
  {:else}
    No tree is present
  {/if}
</div>
