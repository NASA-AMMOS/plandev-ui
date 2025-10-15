<svelte:options immutable={true} />

<script lang="ts">
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { WorkspaceContentType } from '../../enums/workspace';
  import type { ActionDefinition } from '../../types/actions';
  import type { User } from '../../types/app';
  import type { WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../../types/workspace-tree-view';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { pluralize } from '../../utilities/text';
  import { getAvailableActionsForNodes } from '../../utilities/workspaces';

  export let actions: ActionDefinition[] = [];
  export let hasEditPermission: boolean = false;
  export let hasDeletePermission: boolean = false;
  export let nodes: (WorkspaceTreeNodeWithFullPath | WorkspaceTreeNode)[] = [];
  export let user: User | null;

  let fileCountPhrase: string = '';
  let actionsForSelection: ActionDefinition[] = [];

  $: fileCountPhrase = nodes.length > 1 ? `${nodes.length} File${pluralize(nodes.length)}` : '';
  $: actionsForSelection = getAvailableActionsForNodes(actions, nodes);

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
    runAction: ActionDefinition;
    saveSequence: void;
  }>();
</script>

<ContextMenu.Group>
  <!-- Single node actions -->
  {#if nodes.length === 1}
    <div
      use:permissionHandler={{
        hasPermission: hasEditPermission,
        permissionError: 'You do not have permission to edit this workspace',
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
      permissionError: 'You do not have permission to edit this workspace',
    }}
  >
    <ContextMenu.Item disabled={!hasEditPermission} size="sm" on:click={() => dispatch('move')} aria-label="Move/Copy">
      Move/Copy {fileCountPhrase}
    </ContextMenu.Item>
  </div>
  <div
    use:permissionHandler={{
      hasPermission: hasDeletePermission,
      permissionError: 'You do not have permission to delete this workspace',
    }}
  >
    <ContextMenu.Item disabled={!hasDeletePermission} size="sm" on:click={() => dispatch('delete')} aria-label="Delete">
      Delete {fileCountPhrase}
    </ContextMenu.Item>
  </div>
</ContextMenu.Group>
<ContextMenu.Separator />
{#if nodes.length === 1}
  <div
    use:permissionHandler={{
      hasPermission: hasEditPermission,
      permissionError: 'You do not have permission to edit this workspace',
    }}
  >
    <ContextMenu.Item size="sm" on:click={() => dispatch('copyFileLocation')} aria-label="Copy Link to">
      Copy {nodes[0].type === WorkspaceContentType.Directory ? 'Link to Directory' : 'Download Link to File'}
    </ContextMenu.Item>
  </div>
  <ContextMenu.Separator />
{/if}
<ContextMenu.Item size="sm" on:click={() => dispatch('moveToWorkspace')} aria-label="Move to Workspace">
  Move {fileCountPhrase} to Workspace
</ContextMenu.Item>
<ContextMenu.Separator />
<ContextMenu.Sub>
  <ContextMenu.SubTrigger size="sm">Run Action{fileCountPhrase ? ` on ${fileCountPhrase}` : ''}</ContextMenu.SubTrigger>
  <ContextMenu.SubContent class="w-min min-w-[200px]">
    {#each actionsForSelection as action}
      <div
        use:permissionHandler={{
          hasPermission: featurePermissions.actionRun.canCreate(user),
          permissionError: 'You do not have permission to run an action',
        }}
      >
        <ContextMenu.Item size="sm" on:click={() => dispatch('runAction', action)}>
          {action.name}
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
      permissionError: 'You do not have permission to edit this workspace',
    }}
  >
    <ContextMenu.Item size="sm" on:click={() => dispatch('newFile')} aria-label="New File">New File</ContextMenu.Item>
  </div>
  <div
    use:permissionHandler={{
      hasPermission: hasEditPermission,
      permissionError: 'You do not have permission to edit this workspace',
    }}
  >
    <ContextMenu.Item size="sm" on:click={() => dispatch('newFolder')} aria-label="New Folder">
      New Folder
    </ContextMenu.Item>
  </div>
  <div
    use:permissionHandler={{
      hasPermission: hasEditPermission,
      permissionError: 'You do not have permission to edit this workspace',
    }}
  >
    <ContextMenu.Item size="sm" on:click={() => dispatch('importFile')} aria-label="Upload File">
      Upload File
    </ContextMenu.Item>
  </div>
</ContextMenu.Group>
