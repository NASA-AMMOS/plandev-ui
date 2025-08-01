<svelte:options immutable={true} />

<script lang="ts">
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';
  import {
    ArrowUpFromLine,
    Copy,
    FileOutput,
    FilePlus,
    FolderOutput,
    FolderPlus,
    PencilLine,
    Trash2,
  } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { PATH_DELIMITER } from '../../../constants/workspaces';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { User } from '../../../types/app';
  import type { Workspace, WorkspaceNodeEvent } from '../../../types/workspace';
  import type { WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../../../types/workspace-tree-view';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { featurePermissions } from '../../../utilities/permissions';
  import ContextMenuInternal from '../../context-menu/ContextMenu.svelte';
  import WorkspaceTreeViewNode from './WorkspaceTreeViewNode.svelte';

  export let enableContextMenu: boolean = true;
  export let selectedTreeNodePath: string | null | undefined = undefined;
  export let showFiles: boolean = true;
  export let showRootNode: boolean = false;
  export let treeNode: WorkspaceTreeNode | null | undefined = undefined;
  export let workspace: Workspace | null | undefined = null;
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    copyFileLocation: string;
    importFile: string;
    moveToWorkspace: string;
    newFolder: string;
    newSequence: string;
    nodeClicked: WorkspaceNodeEvent;
    nodeDelete: WorkspaceNodeEvent;
    nodeMove: WorkspaceNodeEvent;
    nodeRename: WorkspaceNodeEvent;
  }>();

  let contextMenu: ContextMenuInternal;
  let contextMenuNode: WorkspaceTreeNodeWithFullPath | null = null;
  let hasEditPermission: boolean = false;
  let hasDeletePermission: boolean = false;

  function onNodeRightClicked({
    detail,
  }: CustomEvent<{
    data: WorkspaceNodeEvent;
    event: MouseEvent;
  }>) {
    if (enableContextMenu) {
      const { data, event } = detail;

      contextMenuNode = {
        ...data.treeNode,
        fullPath: data.treeNodePath,
      };
      if (workspace) {
        hasEditPermission = featurePermissions.workspace.canUpdate(user, workspace, contextMenuNode);
        hasDeletePermission = featurePermissions.workspace.canDelete(user, workspace, contextMenuNode);
      }
      contextMenu.show(event);
    }
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

  function onMoveToWorkspace() {
    let targetPath = contextMenuNode?.fullPath ?? '';
    dispatch('moveToWorkspace', targetPath);
  }
</script>

<div class="h-auto pt-1">
  {#if enableContextMenu}
    <ContextMenuInternal bind:this={contextMenu} on:hide={onContextMenuHide}>
      <ContextMenu.Group>
        <ContextMenu.Item size="sm" on:click={onRenameNode} aria-label="Rename">
          <div
            class="flex items-center gap-2"
            use:permissionHandler={{
              hasPermission: hasEditPermission,
              permissionError: 'You do not have permission to edit this workspace',
            }}
          >
            <PencilLine size={14} />
            Rename
          </div>
        </ContextMenu.Item>
        <ContextMenu.Item size="sm" on:click={onMoveNode} aria-label="Move/Copy">
          <div
            class="flex items-center gap-2"
            use:permissionHandler={{
              hasPermission: hasEditPermission,
              permissionError: 'You do not have permission to edit this workspace',
            }}
          >
            <FolderOutput size={14} />
            Move/Copy
          </div>
        </ContextMenu.Item>
        <ContextMenu.Item size="sm" on:click={onDeleteNode} aria-label="Delete">
          <div
            class="flex items-center gap-2"
            use:permissionHandler={{
              hasPermission: hasDeletePermission,
              permissionError: 'You do not have permission to delete this workspace',
            }}
          >
            <Trash2 size={14} />
            Delete
          </div>
        </ContextMenu.Item>
      </ContextMenu.Group>
      <ContextMenu.Separator />
      <ContextMenu.Item size="sm" on:click={onCopyFileLocation} aria-label="Copy Link to">
        <div
          class="flex items-center gap-2"
          use:permissionHandler={{
            hasPermission: hasEditPermission,
            permissionError: 'You do not have permission to edit this workspace',
          }}
        >
          <Copy size={14} /> Copy {contextMenuNode?.type === WorkspaceContentType.Directory
            ? 'Link to Directory'
            : 'Download Link to File'}
        </div>
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Item size="sm" on:click={onMoveToWorkspace} aria-label="Move to Workspace">
        <div class="flex items-center gap-2">
          <FileOutput size={14} /> Move to Workspace
        </div>
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Group>
        <ContextMenu.Item size="sm" on:click={onNewSequence} aria-label="New File">
          <div
            class="flex items-center gap-2"
            use:permissionHandler={{
              hasPermission: hasEditPermission,
              permissionError: 'You do not have permission to edit this workspace',
            }}
          >
            <FilePlus size={14} /> New File
          </div>
        </ContextMenu.Item>
        <ContextMenu.Item size="sm" on:click={onNewFolder} aria-label="New Folder">
          <div
            class="flex items-center gap-2"
            use:permissionHandler={{
              hasPermission: hasEditPermission,
              permissionError: 'You do not have permission to edit this workspace',
            }}
          >
            <FolderPlus size={14} /> New Folder
          </div>
        </ContextMenu.Item>
        <ContextMenu.Item size="sm" on:click={onImportFile} aria-label="Upload File">
          <div
            class="flex items-center gap-2"
            use:permissionHandler={{
              hasPermission: hasEditPermission,
              permissionError: 'You do not have permission to edit this workspace',
            }}
          >
            <ArrowUpFromLine size={14} /> Upload File
          </div>
        </ContextMenu.Item>
      </ContextMenu.Group>
    </ContextMenuInternal>
  {/if}
  {#if showRootNode && treeNode}
    <WorkspaceTreeViewNode
      {selectedTreeNodePath}
      showKebabMenu={enableContextMenu}
      {showFiles}
      {treeNode}
      treeNodePath={treeNode.name}
      on:nodeClicked
      on:nodeRightClicked={onNodeRightClicked}
    />
  {:else if treeNode && treeNode.contents && treeNode.contents.length > 0}
    <!-- Workspace root - just render its contents -->
    {#each treeNode.contents as treeNodeChild (treeNodeChild.name)}
      {#if (!showFiles && treeNodeChild.type === WorkspaceContentType.Directory) || showFiles}
        <WorkspaceTreeViewNode
          {selectedTreeNodePath}
          showKebabMenu={enableContextMenu}
          {showFiles}
          treeNode={treeNodeChild}
          treeNodePath={treeNodeChild.name}
          on:nodeClicked
          on:nodeRightClicked={onNodeRightClicked}
        />
      {/if}
    {/each}
  {:else if treeNode && treeNode.contents?.length === 0}
    <div class="p-2 text-sm text-muted-foreground">Workspace is empty</div>
  {:else}
    <div class="p-2 text-sm text-muted-foreground">No workspace loaded</div>
  {/if}
</div>
