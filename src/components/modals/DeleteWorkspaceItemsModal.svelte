<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { WorkspaceTreeNodeWithFullPath } from '../../types/workspace-tree-view';
  import { flattenWorkspaceTreeWithPaths, getWorkspaceFileFolderDisplay } from '../../utilities/workspaces';
  import WorkspaceTreeViewIcon from '../workspace/WorkspaceTreeView/WorkspaceTreeViewIcon.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let originalNodes: WorkspaceTreeNodeWithFullPath[];
  export let previewLimit: number = 8;
  export let width: number = 440;
  export let workspaceName: string;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: void;
  }>();

  $: typeDisplayString = getWorkspaceFileFolderDisplay(originalNodes);
  $: flatNodes = originalNodes.flatMap(node => {
    const top: WorkspaceTreeNodeWithFullPath = { ...node, depth: 0, fullPath: node.fullPath };
    const children =
      node.contents && node.contents.length > 0
        ? flattenWorkspaceTreeWithPaths(node.contents, [node.fullPath], 1)
        : [];
    return [top, ...children];
  });
  $: visible = flatNodes.slice(0, previewLimit);
  $: remainingCount = Math.max(flatNodes.length - visible.length, 0);

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      dispatch('confirm');
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal height="auto" {width} on:close>
  <ModalHeader on:close>Permanently Delete {typeDisplayString}</ModalHeader>
  <ModalContent>
    <div class="flex flex-col gap-2">
      <span>This will permanently delete the following from the "{workspaceName}" workspace:</span>
      <ul class="m-0 list-none rounded-md border border-(--st-gray-20) p-2">
        {#each visible as node (node.fullPath)}
          <li
            class="flex items-center gap-2 py-0.5"
            style="padding-left: {(node.depth ?? 0) * 16}px"
            title={node.fullPath}
          >
            <WorkspaceTreeViewIcon treeNode={node} />
            <span class="truncate">{node.name}</span>
          </li>
        {/each}
        {#if remainingCount > 0}
          <li class="pt-1 italic opacity-75">…and {remainingCount} more</li>
        {/if}
      </ul>
      <strong>This action cannot be undone.</strong>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}>Cancel</button>
    <button
      class="st-button bg-destructive text-destructive-foreground hover:!bg-destructive/90"
      on:click={() => dispatch('confirm')}
    >
      Permanently Delete
    </button>
  </ModalFooter>
</Modal>
