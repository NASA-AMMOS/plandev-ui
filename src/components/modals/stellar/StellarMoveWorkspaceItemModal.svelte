<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import * as Sidebar from '../../../components/ui/Sidebar/index.js';
  import { WorkspaceContentType } from '../../../enums/workspace';
  import type { User } from '../../../types/app';
  import type { Workspace, WorkspaceNodeEvent } from '../../../types/workspace';
  import type { WorkspaceTreeNode } from '../../../types/workspace-tree-view';
  import { joinPath, separateFilenameFromPath } from '../../../utilities/workspaces';
  import WorkspaceTreeView from '../../workspace/WorkspaceTreeView/WorkspaceTreeView.svelte';
  import StellarDialog from './StellarDialog.svelte';

  export let open: boolean = true;
  export let currentWorkspace: Workspace;
  export let currentWorkspaceContents: WorkspaceTreeNode | null;
  export let originalNode: WorkspaceTreeNode;
  export let originalPath: string;
  export let workspace: Workspace | null | undefined = null;
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: {
      confirm: boolean;
      value?: { originalNode: WorkspaceTreeNode; originalPath: string; shouldCopy: boolean; targetPath: string };
    };
  }>();

  let targetPath: string = joinPath([currentWorkspace.name, originalPath]);
  let originalDirectory: string = '';
  let targetDirectory: string = '';
  let targetFilename: string = '';
  let typeString: string = originalNode.type === WorkspaceContentType.Directory ? 'Directory' : 'File';

  $: {
    const { filename, path } = separateFilenameFromPath(targetPath);
    targetDirectory = path;
    targetFilename = filename;
  }
  $: {
    const fullOriginalPath = joinPath([currentWorkspace.name, originalPath]);
    const { path } = separateFilenameFromPath(fullOriginalPath);
    originalDirectory = path;
  }

  function onFolderClicked(event: CustomEvent<WorkspaceNodeEvent>) {
    targetDirectory = event.detail.treeNodePath;
  }

  function onMove() {
    open = false;
    dispatch('resolve', {
      confirm: true,
      value: {
        originalNode,
        originalPath,
        shouldCopy: false,
        targetPath: joinPath([targetDirectory.replace(new RegExp(`^${currentWorkspace.name}`), ''), targetFilename]),
      },
    });
  }

  function onDuplicate() {
    open = false;
    dispatch('resolve', {
      confirm: true,
      value: {
        originalNode,
        originalPath,
        shouldCopy: true,
        targetPath: joinPath([targetDirectory.replace(new RegExp(`^${currentWorkspace.name}`), ''), targetFilename]),
      },
    });
  }

  function handleCancel() {
    open = false;
  }
</script>

<StellarDialog bind:open size="auto" className="w-[380px] h-[400px]" title="Move/Copy Workspace {typeString}" on:close>
  <div class="flex h-full flex-col gap-1 overflow-hidden py-2">
    <div>
      <div class="pb-0.5 text-xs">Current Location:</div>
      <div class="py-1"><span class="font-semibold">{originalPath}</span></div>
    </div>
    <Sidebar.Provider
      style="--sidebar-width: auto"
      className="min-h-0 flex-1 overflow-y-auto rounded-md border-(--st-gray-20) border-2"
    >
      <Sidebar.Content>
        <Sidebar.Menu className="h-full">
          <WorkspaceTreeView
            selectedTreeNodePath={targetDirectory}
            treeNode={currentWorkspaceContents}
            enableContextMenu={false}
            showFiles={false}
            showRootNode={true}
            {workspace}
            {user}
            on:nodeClicked={onFolderClicked}
          />
        </Sidebar.Menu>
      </Sidebar.Content>
    </Sidebar.Provider>
  </div>
  <svelte:fragment slot="footer">
    <div class="flex w-full justify-end gap-2">
      <button class="st-button secondary" on:click={handleCancel}>Cancel</button>
      <button class="st-button" disabled={targetDirectory === originalDirectory} on:click={onMove}>
        Move {typeString}
      </button>
      <button class="st-button" disabled={targetDirectory === originalDirectory} on:click={onDuplicate}>
        Copy {typeString}
      </button>
    </div>
  </svelte:fragment>
</StellarDialog>
