<svelte:options immutable={true} />

<script lang="ts">
  type NodeData = $$Generic<TNodeData>;

  interface $$Events extends ComponentEvents<SvelteComponent> {
    nodeClicked: CustomEvent<NodeData>;
    nodeOpened: CustomEvent<NodeData>;
    nodeRightClicked: CustomEvent<NodeData>;
  }

  import { type ComponentEvents, createEventDispatcher, SvelteComponent } from 'svelte';
  import { WorkspaceContentType } from '../../../enums/workspace';
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

{#if treeNode.type === WorkspaceContentType.Workspace}
  <div>
    <WorkspaceTreeViewItemLabel {treeNode} />
    {#if treeNode.contents}
      {#each treeNode.contents as treeNodeChild (treeNodeChild.name)}
        <svelte:self treeNode={treeNodeChild} />
      {/each}
    {/if}
  </div>
{:else}
  <div>
    {#if treeNode.contents}
      <WorkspaceTreeViewItemLabel {treeNode} {isOpen} on:click={onToggle} />
      <div class="column-gap-1 grid grid-cols-[0.5rem_auto]" class:hidden={!isOpen}>
        <div class="border-r"></div>
        <div>
          {#each treeNode.contents as treeNodeChild (treeNodeChild.name)}
            <svelte:self treeNode={treeNodeChild} />
          {/each}
        </div>
      </div>
    {:else}
      <WorkspaceTreeViewLeafItem {treeNode} />
    {/if}
  </div>
{/if}
