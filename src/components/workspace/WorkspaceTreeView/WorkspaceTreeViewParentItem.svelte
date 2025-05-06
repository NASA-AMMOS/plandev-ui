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
  import WorkspaceTreeViewItemLabel from './WorkspaceTreeViewItemLabel.svelte';
  import WorkspaceTreeViewLeafItem from './WorkspaceTreeViewLeafItem.svelte';

  export let isOpen: boolean = false;
  export let treeNode: WorkspaceTreeNode;

  const dispatch = createEventDispatcher<Dispatcher<$$Events>>();

  function onToggle() {
    isOpen = !isOpen;
  }
</script>

<button on:click={onToggle}>
  <WorkspaceTreeViewItemLabel {treeNode} />
  {#if treeNode.children}
    {#each treeNode.children as treeNodeChild (treeNodeChild.id)}
      {#if treeNodeChild.children}
        <self treeNode={treeNodeChild}></self>
      {:else}
        <WorkspaceTreeViewLeafItem treeNode={treeNodeChild} />
      {/if}
    {/each}
  {/if}
</button>
