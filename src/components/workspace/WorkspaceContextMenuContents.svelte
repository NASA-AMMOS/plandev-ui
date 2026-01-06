<svelte:options immutable={true} />

<script lang="ts">
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { WorkspaceContentType } from '../../enums/workspace';
  import type { ActionParameterPair } from '../../types/workspace';
  import type { WorkspaceTreeNodeWithFullPath } from '../../types/workspace-tree-view';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { pluralize } from '../../utilities/text';
  import ActionMenuItem from '../ui/ActionMenuItem.svelte';

  export let actionsForSelection: ActionParameterPair[] = [];
  export let hasEditPermission: boolean = false;
  export let hasDeletePermission: boolean = false;
  export let hasCreateActionPermission: boolean = false;
  export let selectedWorkspaceNodes: WorkspaceTreeNodeWithFullPath[] = [];

  const dispatch = createEventDispatcher<{
    actionsMenuFocused: boolean;
    copyFileLocation: void;
    copyFullPath: void;
    delete: WorkspaceTreeNodeWithFullPath[];
    download: void;
    hide: void;
    importFile: void;
    move: WorkspaceTreeNodeWithFullPath[];
    moveToWorkspace: WorkspaceTreeNodeWithFullPath[];
    newFile: void;
    newFolder: void;
    openInNewTab: void;
    rename: void;
    runAction: ActionParameterPair;
    saveSequence: void;
  }>();

  const editPermissionError = 'You do not have permission to edit this workspace';
  const deletePermissionError = 'You do not have permission to delete files in this workspace';

  let areMultipleFilesSelected: boolean = false;
  let actionPhrase: string = '';
  let selectedFolderCount: number = 0;
  let selectedFileCount: number = 0;
  let fileCountPhrase: string = '';

  $: {
    selectedFolderCount = 0;
    selectedFileCount = 0;
    selectedWorkspaceNodes.forEach(node => {
      if (node.type === WorkspaceContentType.Directory) {
        selectedFolderCount++;
      } else {
        selectedFileCount++;
      }
    });

    areMultipleFilesSelected = selectedWorkspaceNodes.length > 1;
    fileCountPhrase = areMultipleFilesSelected
      ? `${selectedWorkspaceNodes.length} Item${pluralize(selectedWorkspaceNodes.length)}`
      : '';
    actionPhrase =
      selectedFileCount > 0 && selectedFolderCount < 1
        ? `${selectedFileCount} File${pluralize(selectedFileCount)}`
        : 'All Files within Selection';
  }
</script>

<ContextMenu.Group>
  <!-- Single node actions -->
  {#if selectedWorkspaceNodes.length === 1}
    <ContextMenu.Item size="sm" on:click={() => dispatch('openInNewTab')} aria-label="Open in new tab">
      Open in New Tab
    </ContextMenu.Item>
    <ContextMenu.Separator />
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
      hasPermission: hasEditPermission,
      permissionError: editPermissionError,
    }}
  >
    <ContextMenu.Item
      disabled={!hasEditPermission}
      size="sm"
      on:click={() => dispatch('move', selectedWorkspaceNodes)}
      aria-label="Move/Copy"
    >
      Move/Copy {fileCountPhrase}
    </ContextMenu.Item>
  </div>
  <div
    use:permissionHandler={{
      hasPermission: hasDeletePermission,
      permissionError: deletePermissionError,
    }}
  >
    <ContextMenu.Item
      disabled={!hasDeletePermission}
      size="sm"
      on:click={() => dispatch('delete', selectedWorkspaceNodes)}
      aria-label="Delete"
    >
      Delete {fileCountPhrase}
    </ContextMenu.Item>
  </div>
</ContextMenu.Group>
<ContextMenu.Separator />
<div>
  <ContextMenu.Item size="sm" on:click={() => dispatch('download')} aria-label="Download File">
    Download
  </ContextMenu.Item>
  {#if selectedWorkspaceNodes.length === 1}
    <ContextMenu.Item size="sm" on:click={() => dispatch('copyFullPath')} aria-label="Copy Full Path">
      Copy Full Path
    </ContextMenu.Item>
  {/if}
</div>
<ContextMenu.Separator />
<div
  use:permissionHandler={{
    hasPermission: hasEditPermission,
    permissionError: editPermissionError,
  }}
>
  <ContextMenu.Item
    size="sm"
    disabled={!hasEditPermission}
    on:click={() => dispatch('moveToWorkspace', selectedWorkspaceNodes)}
    aria-label="Move/Copy to Workspace"
  >
    Move/Copy {fileCountPhrase} to Workspace
  </ContextMenu.Item>
</div>
<ContextMenu.Separator />
<div
  use:permissionHandler={{
    hasPermission: hasCreateActionPermission,
    permissionError: 'You do not have permission to run an action',
  }}
>
  <ContextMenu.Sub onOpenChange={open => dispatch('actionsMenuFocused', open)}>
    <ContextMenu.SubTrigger size="sm">
      Run Action{actionPhrase ? ` on ${actionPhrase}` : ''}
    </ContextMenu.SubTrigger>
    <ContextMenu.SubContent class="max-h-[500px] w-min min-w-[240px] max-w-[300px] overflow-y-auto">
      {#each actionsForSelection as workspaceActionsForNodes}
        <div
          use:permissionHandler={{
            hasPermission: hasCreateActionPermission,
            permissionError: 'You do not have permission to run an action',
          }}
        >
          <ContextMenu.Item size="sm" on:click={() => dispatch('runAction', workspaceActionsForNodes)}>
            <ActionMenuItem
              name={workspaceActionsForNodes.action.name}
              description={workspaceActionsForNodes.action.description}
            />
          </ContextMenu.Item>
        </div>
      {/each}
      {#if actionsForSelection.length === 0}
        <div class="whitespace-nowrap p-1 text-xs text-muted-foreground">No actions available for selection</div>
      {/if}
    </ContextMenu.SubContent>
  </ContextMenu.Sub>
</div>
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
