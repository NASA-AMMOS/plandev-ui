<svelte:options immutable={true} />

<script lang="ts">
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { WorkspaceContentType } from '../../enums/workspace';
  import type { ActionParameterPair } from '../../types/workspace';
  import type { WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../../types/workspace-tree-view';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { pluralize } from '../../utilities/text';

  export let actionsForSelection: ActionParameterPair[] = [];
  export let hasEditPermission: boolean = false;
  export let hasDeletePermission: boolean = false;
  export let hasCreateActionPermission: boolean = false;
  export let selectedWorkspaceNodes: (WorkspaceTreeNodeWithFullPath | WorkspaceTreeNode)[] = [];

  const dispatch = createEventDispatcher<{
    copyFileLocation: void;
    delete: void;
    hide: void;
    importFile: void;
    move: void;
    moveToWorkspace: void;
    newFile: void;
    newFolder: void;
    rename: void;
    runAction: ActionParameterPair;
    saveSequence: void;
  }>();

  const editPermissionError = 'You do not have permission to edit this workspace';
  const deletePermissionError = 'You do not have permission to delete files in this workspace';

  const multiFileOperationError = 'Currently only supports single file operations';

  let areMultipleFilesSelected: boolean = false;
  let fileCountPhrase: string = '';

  $: {
    areMultipleFilesSelected = selectedWorkspaceNodes.length > 1;
    fileCountPhrase = areMultipleFilesSelected
      ? `${selectedWorkspaceNodes.length} File${pluralize(selectedWorkspaceNodes.length)}`
      : '';
  }
</script>

<ContextMenu.Group>
  <!-- Single node actions -->
  {#if selectedWorkspaceNodes.length === 1}
    <div
      use:permissionHandler={{
        hasPermission: hasEditPermission,
        permissionError: editPermissionError,
      }}
    >
      <ContextMenu.Item disabled={!hasEditPermission} size="sm" on:click={() => dispatch('rename')} aria-label="Rename">
        Rename
      </ContextMenu.Item>
    </div>
  {/if}
  <div
    use:permissionHandler={{
      hasPermission: hasEditPermission && !areMultipleFilesSelected,
      permissionError: areMultipleFilesSelected ? multiFileOperationError : editPermissionError,
    }}
  >
    <ContextMenu.Item
      disabled={!(hasEditPermission && !areMultipleFilesSelected)}
      size="sm"
      on:click={() => dispatch('move')}
      aria-label="Move/Copy"
    >
      Move/Copy {fileCountPhrase}
    </ContextMenu.Item>
  </div>
  <div
    use:permissionHandler={{
      hasPermission: hasDeletePermission && !areMultipleFilesSelected,
      permissionError: areMultipleFilesSelected ? multiFileOperationError : deletePermissionError,
    }}
  >
    <ContextMenu.Item
      disabled={!(hasDeletePermission && !areMultipleFilesSelected)}
      size="sm"
      on:click={() => dispatch('delete')}
      aria-label="Delete"
    >
      Delete {fileCountPhrase}
    </ContextMenu.Item>
  </div>
</ContextMenu.Group>
<ContextMenu.Separator />
{#if selectedWorkspaceNodes.length === 1}
  <div>
    <ContextMenu.Item size="sm" on:click={() => dispatch('copyFileLocation')} aria-label="Copy Link to">
      Copy {selectedWorkspaceNodes[0].type === WorkspaceContentType.Directory
        ? 'Link to Directory'
        : 'Download Link to File'}
    </ContextMenu.Item>
  </div>
  <ContextMenu.Separator />
{/if}
<div
  use:permissionHandler={{
    hasPermission: !areMultipleFilesSelected,
    permissionError: multiFileOperationError,
  }}
>
  <ContextMenu.Item size="sm" on:click={() => dispatch('moveToWorkspace')} aria-label="Move to Workspace">
    Move {fileCountPhrase} to Workspace
  </ContextMenu.Item>
</div>
<ContextMenu.Separator />
<ContextMenu.Sub>
  <ContextMenu.SubTrigger size="sm">Run Action{fileCountPhrase ? ` on ${fileCountPhrase}` : ''}</ContextMenu.SubTrigger>
  <ContextMenu.SubContent class="w-min min-w-[200px]">
    {#each actionsForSelection as workspaceActionsForNodes}
      <div
        use:permissionHandler={{
          hasPermission: hasCreateActionPermission,
          permissionError: 'You do not have permission to run an action',
        }}
      >
        <ContextMenu.Item size="sm" on:click={() => dispatch('runAction', workspaceActionsForNodes)}>
          {workspaceActionsForNodes.action.name}
        </ContextMenu.Item>
      </div>
    {/each}
    {#if actionsForSelection.length === 0}
      <div class="whitespace-nowrap p-1 text-xs text-muted-foreground">No actions available for selection</div>
    {/if}
  </ContextMenu.SubContent>
</ContextMenu.Sub>
<ContextMenu.Separator />
<ContextMenu.Group>
  <div
    use:permissionHandler={{
      hasPermission: hasEditPermission,
      permissionError: editPermissionError,
    }}
  >
    <ContextMenu.Item size="sm" on:click={() => dispatch('newFile')} aria-label="New File">New File</ContextMenu.Item>
  </div>
  <div
    use:permissionHandler={{
      hasPermission: hasEditPermission,
      permissionError: editPermissionError,
    }}
  >
    <ContextMenu.Item size="sm" on:click={() => dispatch('newFolder')} aria-label="New Folder">
      New Folder
    </ContextMenu.Item>
  </div>
  <div
    use:permissionHandler={{
      hasPermission: hasEditPermission,
      permissionError: editPermissionError,
    }}
  >
    <ContextMenu.Item size="sm" on:click={() => dispatch('importFile')} aria-label="Upload File">
      Upload File
    </ContextMenu.Item>
  </div>
</ContextMenu.Group>
