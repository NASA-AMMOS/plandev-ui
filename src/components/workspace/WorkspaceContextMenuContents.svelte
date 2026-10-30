<svelte:options immutable={true} />

<script lang="ts">
  import { cn, ContextMenu } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { WorkspaceContentType } from '../../enums/workspace';
  import { getUserStore } from '../../stores/user';
  import { workspaceId } from '../../stores/workspaces';
  import type { UserStore } from '../../types/app';
  import type { DownloadMenuOption } from '../../types/dropdown';
  import type { ActionParameterPair } from '../../types/workspace';
  import type { WorkspaceTreeNodeWithFullPath } from '../../types/workspace-tree-view';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { pluralize } from '../../utilities/text';
  import { getDownloadOptionsForFile, WorkspaceApi } from '../../utilities/workspaces';
  import ActionMenuItem from '../ui/ActionMenuItem.svelte';
  import Tooltip from '../ui/Tooltip.svelte';

  export let actionsForSelection: ActionParameterPair[] = [];
  export let hasEditPermission: boolean = false;
  export let hasDeletePermission: boolean = false;
  export let hasCreateActionPermission: boolean = false;
  export let hasReadOnlyNodes: boolean = false;
  export let selectedWorkspaceNodes: WorkspaceTreeNodeWithFullPath[] = [];

  const dispatch = createEventDispatcher<{
    actionsMenuFocused: boolean;
    compareFiles: WorkspaceTreeNodeWithFullPath[];
    compareRevisions: WorkspaceTreeNodeWithFullPath;
    copyFileLocation: void;
    copyFullPath: void;
    delete: WorkspaceTreeNodeWithFullPath[];
    download: { withRevision: boolean };
    hide: void;
    importFile: void;
    move: WorkspaceTreeNodeWithFullPath[];
    moveToWorkspace: WorkspaceTreeNodeWithFullPath[];
    newFile: void;
    newFolder: void;
    openFolder: void;
    openInNewTab: void;
    rename: void;
    runAction: ActionParameterPair;
  }>();

  const editPermissionError = 'You do not have permission to edit this workspace';
  const deletePermissionError = 'You do not have permission to delete files in this workspace';
  const readOnlyError = 'Some read-only files selected. You cannot modify read-only files.';
  const user: UserStore = getUserStore();

  let areMultipleFilesSelected: boolean = false;
  let actionPhrase: string = '';
  let canDownloadWithRevision: boolean = false;
  let deleteError: string = deletePermissionError;
  let downloadOptions: DownloadMenuOption[] = [];
  let editError: string = editPermissionError;
  let selectedFolderCount: number = 0;
  let selectedFileCount: number = 0;
  let fileCountPhrase: string = '';

  /** A single, non-directory selection can offer a plain or revision-versioned download name. */
  $: canDownloadWithRevision =
    selectedWorkspaceNodes.length === 1 && selectedWorkspaceNodes[0].type !== WorkspaceContentType.Directory;
  $: if (selectedWorkspaceNodes.length > 1) {
    downloadOptions = [
      { label: 'Download files', name: '' },
      { label: 'Download files with revision in filename (when possible)', name: '' },
    ];
  } else {
    loadDownloadOptionsForFile();
  }

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

    // Set appropriate error message
    deleteError = hasReadOnlyNodes ? readOnlyError : deletePermissionError;
    editError = hasReadOnlyNodes ? readOnlyError : editPermissionError;
  }

  async function loadDownloadOptionsForFile() {
    if (!canDownloadWithRevision) {
      return;
    }

    const { matchingRevision, revisions } = await WorkspaceApi.getFileRevisionList(
      $workspaceId,
      selectedWorkspaceNodes[0].fullPath,
      $user,
    );

    const latestRevision = revisions[0];
    downloadOptions = getDownloadOptionsForFile(
      selectedWorkspaceNodes[0].name ?? '',
      matchingRevision === latestRevision?.name,
      latestRevision?.name ?? null,
    );
  }

  function onDownloadOptionClick(option: DownloadMenuOption, withRevision: boolean) {
    if (!option.disabled) {
      dispatch('download', { withRevision });
    }
  }
</script>

<ContextMenu.Group>
  <!-- Single node actions -->
  {#if selectedWorkspaceNodes.length === 1}
    {#if selectedFolderCount === 1}
      <ContextMenu.Item size="sm" on:click={() => dispatch('openFolder')} aria-label="Open folder">
        Open Folder
      </ContextMenu.Item>
    {/if}
    <ContextMenu.Item size="sm" on:click={() => dispatch('openInNewTab')} aria-label="Open in new tab">
      Open in New Tab
    </ContextMenu.Item>
    <ContextMenu.Separator />
    <div
      use:permissionHandler={{
        hasPermission:
          hasDeletePermission &&
          !(selectedWorkspaceNodes[0].type !== WorkspaceContentType.Directory && hasReadOnlyNodes),
        permissionError: editError,
      }}
    >
      <ContextMenu.Item
        disabled={!hasEditPermission ||
          (selectedWorkspaceNodes[0].type !== WorkspaceContentType.Directory && hasReadOnlyNodes)}
        size="sm"
        on:click={() => dispatch('rename')}
        aria-label="Rename"
      >
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
      <span class={hasReadOnlyNodes ? 'opacity-50' : ''}>Move</span>/Copy {fileCountPhrase}
    </ContextMenu.Item>
  </div>
  <div
    use:permissionHandler={{
      hasPermission: hasDeletePermission && !hasReadOnlyNodes,
      permissionError: deleteError,
    }}
  >
    <ContextMenu.Item
      disabled={!hasDeletePermission || hasReadOnlyNodes}
      size="sm"
      on:click={() => dispatch('delete', selectedWorkspaceNodes)}
      aria-label="Delete"
    >
      Delete {fileCountPhrase}
    </ContextMenu.Item>
  </div>
</ContextMenu.Group>
{#if selectedFolderCount === 0 && selectedWorkspaceNodes.length >= 1}
  <ContextMenu.Separator />
  {#if selectedWorkspaceNodes.length === 1}
    <ContextMenu.Item
      size="sm"
      on:click={() => dispatch('compareRevisions', selectedWorkspaceNodes[0])}
      aria-label="Compare revisions for file"
    >
      Compare revisions for file
    </ContextMenu.Item>
  {:else}
    <ContextMenu.Item
      size="sm"
      disabled={selectedWorkspaceNodes.length !== 2}
      on:click={() => dispatch('compareFiles', selectedWorkspaceNodes)}
      aria-label="Compare selected files"
    >
      Compare selected files
    </ContextMenu.Item>
  {/if}
{/if}
<ContextMenu.Separator />
<div>
  <ContextMenu.Sub>
    <ContextMenu.SubTrigger size="sm">Download</ContextMenu.SubTrigger>
    <ContextMenu.SubContent>
      {#each downloadOptions as option, i (option.label)}
        <Tooltip
          content={option.disabledReason ?? ''}
          disabled={!option.disabled || !option.disabledReason}
          wrapperClass="w-full"
        >
          <ContextMenu.Item
            size="sm"
            class={cn(
              'whitespace-nowrap',
              option.disabled ? 'cursor-not-allowed text-muted-foreground opacity-50' : '',
            )}
            on:click={() => onDownloadOptionClick(option, i === 1)}
            aria-label={i === 0 ? 'Download File' : 'Download File with revision'}
          >
            {option.label}
          </ContextMenu.Item>
        </Tooltip>
      {/each}
    </ContextMenu.SubContent>
  </ContextMenu.Sub>
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
    <span class={hasReadOnlyNodes ? 'opacity-50' : ''}>Move</span>/Copy {fileCountPhrase} to Workspace
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
