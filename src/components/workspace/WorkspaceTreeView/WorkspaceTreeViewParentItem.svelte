<svelte:options immutable={true} />

<script lang="ts">
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import WorkspaceTreeViewItemLabel from './WorkspaceTreeViewItemLabel.svelte';
  import WorkspaceTreeViewLeafItem from './WorkspaceTreeViewLeafItem.svelte';

  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let treeNode: WorkspaceTreeNode;
  export let treeNodePath: string;

  let isOpen: boolean = false;

  $: if (selectedTreeNodePath) {
    const pathRegex = new RegExp(`^${treeNodePath}`);
    const isOnPath = pathRegex.test(selectedTreeNodePath);

    if (isOnPath) {
      isOpen = true;
    }
  }

  function onToggle() {
    isOpen = !isOpen;
  }
</script>

{#if treeNode.type === WorkspaceContentType.Workspace}
  <div>
    <WorkspaceTreeViewItemLabel {isOpen} {selectedTreeNodePath} {treeNode} {treeNodePath} />
    {#if treeNode.contents}
      {#each treeNode.contents as treeNodeChild (treeNodeChild.name)}
        <svelte:self
          treeNode={treeNodeChild}
          {selectedTreeNodePath}
          treeNodePath={`${treeNodePath}/${treeNodeChild.name}`}
          on:nodeClicked
          on:nodeRightClicked
        />
      {/each}
    {/if}
  </div>
{:else}
  <div>
    {#if treeNode.contents}
      <WorkspaceTreeViewItemLabel
        {isOpen}
        {selectedTreeNodePath}
        {treeNode}
        {treeNodePath}
        on:nodeClicked={onToggle}
        on:nodeClicked
      />
      <div class="column-gap-1 grid grid-cols-[0.5rem_auto]" class:hidden={!isOpen}>
        <div class="border-r"></div>
        <div>
          {#each treeNode.contents as treeNodeChild (treeNodeChild.name)}
            <svelte:self
              {selectedTreeNodePath}
              treeNode={treeNodeChild}
              treeNodePath={`${treeNodePath}/${treeNodeChild.name}`}
              on:nodeClicked
              on:nodeRightClicked
            />
          {/each}
        </div>
      </div>
    {:else}
      <WorkspaceTreeViewLeafItem {selectedTreeNodePath} {treeNode} {treeNodePath} on:nodeClicked on:nodeRightClicked />
    {/if}
  </div>
{/if}
