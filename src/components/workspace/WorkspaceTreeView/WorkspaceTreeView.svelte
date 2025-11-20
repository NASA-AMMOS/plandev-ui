<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { PATH_DELIMITER } from '../../../constants/workspaces';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { ActionDefinition } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import type {
    ActionParameterPair,
    Workspace,
    WorkspaceNodeEvent,
    WorkspaceNodeRunActionEvent,
  } from '../../../types/workspace';
  import type { WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../../../types/workspace-tree-view';
  import { featurePermissions } from '../../../utilities/permissions';
  import { getAvailableActionsForNodes } from '../../../utilities/workspaces';
  import ContextMenuInternal from '../../context-menu/ContextMenu.svelte';
  import WorkspaceContextMenuContents from '../WorkspaceContextMenuContents.svelte';
  import WorkspaceTreeViewNode from './WorkspaceTreeViewNode.svelte';

  export let actions: ActionDefinition[] = [];
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
    runAction: WorkspaceNodeRunActionEvent;
  }>();

  let actionsForSelection: ActionParameterPair[] = [];
  let contextMenu: ContextMenuInternal;
  let contextMenuNode: WorkspaceTreeNodeWithFullPath | null = null;
  let hasEditPermission: boolean = false;
  let hasDeletePermission: boolean = false;
  let hasCreateActionPermission: boolean = false;

  $: if (contextMenuNode) {
    actionsForSelection = getAvailableActionsForNodes(actions, [contextMenuNode]);
  }

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
        hasCreateActionPermission = featurePermissions.actionRun.canCreate(user, workspace);
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

  function onRunAction(event: CustomEvent<ActionParameterPair>) {
    if (contextMenuNode) {
      const actionParameterPair = event.detail;
      dispatch('runAction', { actionParameterPair, treeNodes: [contextMenuNode] });
    }
  }
</script>

<div class="h-auto pt-1">
  {#if enableContextMenu}
    <ContextMenuInternal bind:this={contextMenu} on:hide={onContextMenuHide}>
      <WorkspaceContextMenuContents
        {actionsForSelection}
        {hasEditPermission}
        {hasDeletePermission}
        {hasCreateActionPermission}
        selectedWorkspaceNodes={contextMenuNode ? [contextMenuNode] : []}
        on:rename={onRenameNode}
        on:move={onMoveNode}
        on:delete={onDeleteNode}
        on:copyFileLocation={onCopyFileLocation}
        on:moveToWorkspace={onMoveToWorkspace}
        on:runAction={onRunAction}
        on:newFile={onNewSequence}
        on:newFolder={onNewFolder}
        on:importFile={onImportFile}
      />
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
