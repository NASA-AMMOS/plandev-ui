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
  import TreeViewLeafItem from './TreeViewLeafItem.svelte';

  export let isOpen: boolean = false;
  export let treeNode: TreeNode;
  export let treeNodeIconComponent: any;

  const dispatch = createEventDispatcher<Dispatcher<$$Events>>();

  function onToggle() {
    isOpen = !isOpen;
  }
</script>

<button on:click={onToggle}>
  <TreeViewItemLabel {treeNode}>
    <div slot="icon">
      {#if isOpen}
        v
      {:else}
        >
      {/if}
    </div>
  </TreeViewItemLabel>
  {#if treeNode.children}
    {#each treeNode.children as treeNodeChild (treeNodeChild.id)}
      {#if treeNodeChild.children}
        <svelte:self treeNode={treeNodeChild} {treeNodeIconComponent} />
      {:else}
        <TreeViewLeafItem treeNode={treeNodeChild} {treeNodeIconComponent} />
      {/if}
    {/each}
  {/if}
</button>
