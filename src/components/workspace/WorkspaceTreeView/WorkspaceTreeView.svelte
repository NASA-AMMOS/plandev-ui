<svelte:options immutable={true} />

<script lang="ts">
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';
  import { ArrowUpFromLine, Copy, FilePlus, FolderOutput, FolderPlus, PencilLine, Trash2 } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { PATH_DELIMITER } from '../../../constants/workspaces';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { WorkspaceNodeEvent } from '../../../types/workspace';
  import type { WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../../../types/workspace-tree-view';
  import ContextMenuInternal from '../../context-menu/ContextMenu.svelte';
  import WorkspaceTreeViewNode from './WorkspaceTreeViewNode.svelte';

  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let treeNode: WorkspaceTreeNode | null | undefined = undefined;

  const dispatch = createEventDispatcher<{
    copyFileLocation: string;
    importFile: string;
    newFolder: string;
    newSequence: string;
    nodeClicked: WorkspaceNodeEvent;
    nodeDelete: WorkspaceNodeEvent;
    nodeMove: WorkspaceNodeEvent;
    nodeRename: WorkspaceNodeEvent;
  }>();

  let contextMenu: ContextMenuInternal;
  let contextMenuNode: WorkspaceTreeNodeWithFullPath | null = null;

  function onNodeRightClicked({
    detail,
  }: CustomEvent<{
    data: WorkspaceNodeEvent;
    event: MouseEvent;
  }>) {
    const { data, event } = detail;

    contextMenuNode = {
      ...data.treeNode,
      fullPath: data.treeNodePath,
    };
    contextMenu.show(event);
  }

  function onContextMenuHide() {
    contextMenuNode = null;
  }

  function onDeleteNode() {
    if (contextMenuNode) {
      dispatch('nodeDelete', {
        toggleState: true,
        treeNode: contextMenuNode,
        treeNodePath: contextMenuNode.fullPath,
      });
    }
  }

  function onMoveNode() {
    if (contextMenuNode) {
      dispatch('nodeMove', {
        toggleState: true,
        treeNode: contextMenuNode,
        treeNodePath: contextMenuNode.fullPath,
      });
    }
  }

  function onRenameNode() {
    if (contextMenuNode) {
      dispatch('nodeRename', {
        toggleState: true,
        treeNode: contextMenuNode,
        treeNodePath: contextMenuNode.fullPath,
      });
    }
  }

  function onNewFolder() {
    let targetPath = contextMenuNode?.fullPath ?? '';
    if (contextMenuNode?.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('newFolder', targetPath);
  }

  function onNewSequence() {
    let targetPath = contextMenuNode?.fullPath ?? '';
    if (contextMenuNode?.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('newSequence', targetPath);
  }

  function onImportFile() {
    let targetPath = contextMenuNode?.fullPath ?? '';
    if (contextMenuNode?.type !== WorkspaceContentType.Directory) {
      targetPath = targetPath.split(PATH_DELIMITER).slice(0, -1).join(PATH_DELIMITER);
    }
    dispatch('importFile', targetPath);
  }

  function onCopyFileLocation() {
    let targetPath = contextMenuNode?.fullPath ?? '';
    dispatch('copyFileLocation', targetPath);
  }
</script>

<div class="h-full py-1">
  <ContextMenuInternal bind:this={contextMenu} on:hide={onContextMenuHide}>
    <ContextMenu.Group>
      <ContextMenu.Item class="flex gap-1" size="sm" on:click={onRenameNode}>
        <PencilLine size={16} />
        Rename
      </ContextMenu.Item>
      <ContextMenu.Item class="flex gap-1" size="sm" on:click={onMoveNode}>
        <FolderOutput size={16} />
        Move
      </ContextMenu.Item>
      <ContextMenu.Item class="flex gap-1" size="sm" on:click={onDeleteNode}>
        <Trash2 size={16} />
        Delete
      </ContextMenu.Item>
    </ContextMenu.Group>
    <ContextMenu.Separator />
    <ContextMenu.Group>
      <ContextMenu.Item class="flex gap-1" size="sm" on:click={onCopyFileLocation}>
        <Copy size={16} /> Copy link to file
      </ContextMenu.Item>
    </ContextMenu.Group>
    <ContextMenu.Separator />
    <ContextMenu.Group>
      <ContextMenu.Item class="flex gap-1" size="sm" on:click={onNewSequence}>
        <FilePlus size={16} /> New Sequence
      </ContextMenu.Item>
      <ContextMenu.Item class="flex gap-1" size="sm" on:click={onNewFolder}>
        <FolderPlus size={16} /> New Folder
      </ContextMenu.Item>
      <ContextMenu.Item class="flex gap-1" size="sm" on:click={onImportFile}>
        <ArrowUpFromLine size={16} /> Import File
      </ContextMenu.Item>
    </ContextMenu.Group>
  </ContextMenuInternal>
  {#if treeNode && treeNode.contents}
    <!-- Workspace root - just render its contents -->
    {#each treeNode.contents as treeNodeChild (treeNodeChild.name)}
      <WorkspaceTreeViewNode
        {selectedTreeNodePath}
        treeNode={treeNodeChild}
        treeNodePath={treeNodeChild.name}
        on:nodeClicked
        on:nodeRightClicked={onNodeRightClicked}
      />
    {/each}
  {:else}
    <div class="p-2 text-sm text-muted-foreground">No workspace loaded</div>
  {/if}
</div>
