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
  import TreeViewItemLabel from './TreeViewItemLabel.svelte';

  export let treeNode: TreeNode;
  export let treeNodeIconComponent: any;

  const dispatch = createEventDispatcher<Dispatcher<$$Events>>();
</script>

<div>
  <TreeViewItemLabel {treeNode} {treeNodeIconComponent} />
</div>
