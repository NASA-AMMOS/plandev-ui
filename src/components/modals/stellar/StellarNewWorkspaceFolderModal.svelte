<svelte:options immutable={true} />

<script lang="ts">
  import { Input, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import * as Sidebar from '../../../components/ui/Sidebar/index.js';
  import type { User } from '../../../types/app';
  import type { Workspace, WorkspaceNodeEvent } from '../../../types/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import { cleanPath, joinPath } from '../../../utilities/workspaces.js';
  import WorkspaceTreeView from '../../workspace/WorkspaceTreeView/WorkspaceTreeView.svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let currentWorkspace: Workspace | null | undefined = null;
  export let currentWorkspaceContents: WorkspaceTreeNode | null;
  export let startingPath: string = '';
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean; value?: { folderPath: string } };
  }>();

  let folderPath: string = joinPath([currentWorkspace?.name ?? '', startingPath]);
  let folderName: string = '';

  $: confirmButtonDisabled = folderName.trim() === '';

  function onFolderClicked(event: CustomEvent<WorkspaceNodeEvent>) {
    folderPath = event.detail.treeNodePath;
  }

  function handleCancel() {
    open = false;
  }

  function handleConfirm() {
    if (!confirmButtonDisabled) {
      open = false;
      dispatch('resolve', {
        confirm: true,
        value: {
          folderPath: cleanPath(
            joinPath([folderPath.replace(new RegExp(`^${currentWorkspace?.name}`), '.'), folderName.trim()]),
          ),
        },
      });
    }
  }

  function onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
  }
</script>

<StellarDialog bind:open size="md" title="New Workspace Folder" on:close>
  <div class="grid h-[400px] grid-rows-[min-content_1fr_min-content] gap-4 overflow-hidden">
    <div>
      <div class="pb-1 text-xs text-muted-foreground">Current Location:</div>
      <div class="font-semibold">{joinPath([currentWorkspace?.name ?? '', startingPath])}</div>
    </div>
    <Sidebar.Provider style="--sidebar-width: auto" className="min-h-0 overflow-y-auto rounded-md border border-border">
      <Sidebar.Content>
        <Sidebar.Menu className="h-full">
          <WorkspaceTreeView
            selectedTreeNodePath={folderPath}
            treeNode={currentWorkspaceContents}
            enableContextMenu={false}
            showFiles={false}
            showRootNode={true}
            workspace={currentWorkspace}
            {user}
            on:nodeClicked={onFolderClicked}
          />
        </Sidebar.Menu>
      </Sidebar.Content>
    </Sidebar.Provider>
    <div class="grid gap-2">
      <Label for="folder-name">Folder Name</Label>
      <Input id="folder-name" name="folder-name" autocomplete="off" bind:value={folderName} on:keydown={onInputKeydown} />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      confirmDisabled={confirmButtonDisabled}
      on:cancel={handleCancel}
      on:confirm={handleConfirm}
    />
  </svelte:fragment>
</StellarDialog>
