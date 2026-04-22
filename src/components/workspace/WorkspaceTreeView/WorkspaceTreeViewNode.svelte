<script lang="ts">
  import { Collapsible } from '@nasa-jpl/stellar-svelte';
  import { ChevronRight } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { WorkspaceNodeEvent } from '../../../types/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view.js';
  import { separateFilenameFromPath } from '../../../utilities/workspaces';
  import * as Sidebar from '../../ui/Sidebar/index.js';
  import WorkspaceTreeViewIcon from './WorkspaceTreeViewIcon.svelte';

  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let showFiles: boolean = true;
  export let treeNode: WorkspaceTreeNode;
  export let treeNodePath: string = '';
  export let depth: number = 0;

  let previousSelectedTreeNodePath: string | null | undefined = undefined;

  const dispatch = createEventDispatcher<{
    nodeClicked: WorkspaceNodeEvent;
  }>();

  let isFolder: boolean = false;
  let isOpen: boolean = false;
  let setOpenDebounceTimer: NodeJS.Timeout;

  $: isFolder = treeNode.type === WorkspaceContentType.Directory || treeNode.type === WorkspaceContentType.Workspace;

  $: if (selectedTreeNodePath && selectedTreeNodePath !== previousSelectedTreeNodePath) {
    if (!isOpen) {
      const { path } = separateFilenameFromPath(selectedTreeNodePath);
      const pathRegex = new RegExp(`^${treeNodePath}/`);
      const isOnPath = pathRegex.test(`${path}/`);

      if (isOnPath) {
        setOpen(true);
      }
    }
    previousSelectedTreeNodePath = selectedTreeNodePath;
  }

  function setOpen(openState: boolean) {
    clearTimeout(setOpenDebounceTimer);
    setOpenDebounceTimer = setTimeout(() => {
      isOpen = openState;
    }, 1);
  }

  function onNodeClicked() {
    let openState: boolean = true;
    if (isFolder) {
      openState = !isOpen;
      setOpen(openState);
    }
    dispatch('nodeClicked', {
      treeNode,
      treeNodePath,
    });
  }
</script>

{#if isFolder}
  <Sidebar.MenuItem>
    <Collapsible.Root open={isOpen}>
      <Collapsible.Trigger class="w-full">
        <Sidebar.MenuSubButton
          isActive={selectedTreeNodePath === treeNodePath}
          {depth}
          on:click={onNodeClicked}
          className="group/item"
        >
          <ChevronRight size={16} class={isOpen ? 'rotate-90' : ''} />
          <WorkspaceTreeViewIcon {treeNode} toggleState={isOpen} />
          <div class=" grid grid-cols-[auto_min-content] items-center justify-between">
            <span class="truncate">{treeNode.name}</span>
          </div>
        </Sidebar.MenuSubButton>
      </Collapsible.Trigger>
      <Collapsible.Content transitionConfig={{ duration: 0 }}>
        <Sidebar.MenuSub {depth}>
          {#if treeNode.contents}
            {#each treeNode.contents as treeNodeChild (treeNodeChild.name)}
              <svelte:self
                {selectedTreeNodePath}
                treeNode={treeNodeChild}
                treeNodePath={`${treeNodePath}/${treeNodeChild.name}`}
                depth={depth + 1}
                {showFiles}
                on:nodeClicked
              />
            {/each}
          {/if}
        </Sidebar.MenuSub>
      </Collapsible.Content>
    </Collapsible.Root>
  </Sidebar.MenuItem>
{:else if showFiles}
  <!-- File item -->
  <Sidebar.MenuItem>
    <div class="w-full">
      <Sidebar.MenuSubButton
        isActive={selectedTreeNodePath === treeNodePath}
        {depth}
        on:click={onNodeClicked}
        className="group/item"
      >
        <div class="w-4"></div>
        <!-- Spacer for missing chevron -->
        <WorkspaceTreeViewIcon {treeNode} />
        <div class="grid grid-cols-[auto_min-content] items-center justify-between">
          <span class="truncate">{treeNode.name}</span>
        </div>
      </Sidebar.MenuSubButton>
    </div>
  </Sidebar.MenuItem>
{/if}
