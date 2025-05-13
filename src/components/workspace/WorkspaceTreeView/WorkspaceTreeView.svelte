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
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import WorkspaceTreeViewParentItem from './WorkspaceTreeViewParentItem.svelte';

  export let treeNode: WorkspaceTreeNode | null | undefined = undefined;

  const dispatch = createEventDispatcher<Dispatcher<$$Events>>();
</script>

<div>
  {#if treeNode}
    <WorkspaceTreeViewParentItem {treeNode} />
  {:else}
    No tree is present
  {/if}
</div>
