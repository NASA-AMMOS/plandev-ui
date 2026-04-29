<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { WorkspaceContentType } from '../../enums/workspace';
  import type { WorkspaceTreeNodeWithFullPath } from '../../types/workspace-tree-view';
  import { pluralize } from '../../utilities/text';
  import { flattenWorkspaceTreeWithPaths, getWorkspaceFileFolderDisplay } from '../../utilities/workspaces';
  import WorkspaceTreeViewIcon from '../workspace/WorkspaceTreeView/WorkspaceTreeViewIcon.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let originalNodes: WorkspaceTreeNodeWithFullPath[];
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
      node.contents && node.contents.length > 0 ? flattenWorkspaceTreeWithPaths(node.contents, [node.fullPath], 1) : [];
    return [top, ...children];
  });
  $: fileCount = flatNodes.filter(node => node.type !== WorkspaceContentType.Directory).length;

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
      <span>
        This will permanently delete the following {fileCount} file{pluralize(fileCount)} from the "{workspaceName}"
        workspace:
      </span>
      <ul class="border-(--st-gray-20) m-0 max-h-64 list-none overflow-y-auto rounded-md border p-2">
        {#each flatNodes as node (node.fullPath)}
          <li
            class="flex items-center gap-1 py-0.5"
            style="padding-left: {(node.depth ?? 0) * 16}px"
            title={node.fullPath}
          >
            <WorkspaceTreeViewIcon treeNode={node} />
            <span class="truncate">{node.name}</span>
          </li>
        {/each}
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
