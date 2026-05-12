<svelte:options immutable={true} />

<script lang="ts">
  import { Checkbox } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import * as Sidebar from '../../components/ui/Sidebar/index.js';
  import type { Workspace, WorkspaceNodeEvent } from '../../types/workspace';
  import type { WorkspaceTreeNode, WorkspaceTreeNodeWithFullPath } from '../../types/workspace-tree-view';
  import { permissionHandler } from '../../utilities/permissionHandler.js';
  import {
    getSelectedFilesDisplay,
    getWorkspaceFileFolderDisplay,
    joinPath,
    removeFirstPathSegment,
    separateFilenameFromPath,
  } from '../../utilities/workspaces';
  import WorkspaceTreeView from '../workspace/WorkspaceTreeView/WorkspaceTreeView.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let currentWorkspace: Workspace;
  export let currentWorkspaceContents: WorkspaceTreeNode | null;
  export let originalNodes: WorkspaceTreeNodeWithFullPath[];
  export let selectionHasReadOnlyNodes: boolean = false;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: {
      shouldCopy: boolean;
      shouldOverwrite: boolean;
      targetPath: string;
    };
  }>();

  let displayString: string = getWorkspaceFileFolderDisplay(originalNodes);
  let shouldOverwrite: boolean = false;
  let targetDirectory: string = currentWorkspace.name;

  $: if (originalNodes.length === 1) {
    targetDirectory = separateFilenameFromPath(joinPath([currentWorkspace.name, originalNodes[0].fullPath])).path;
  } else {
    targetDirectory = currentWorkspace.name;
  }

  function onFolderClicked(event: CustomEvent<WorkspaceNodeEvent>) {
    targetDirectory = event.detail.treeNodePath;
  }

  function onMove() {
    // Only move files that have no read only nodes
    if (!selectionHasReadOnlyNodes) {
      // targetDirectory includes workspace name as first segment (e.g., "workspace/folder/subfolder")
      // Remove it since the API expects paths relative to the workspace root
      dispatch('confirm', {
        shouldCopy: false,
        shouldOverwrite,
        targetPath: removeFirstPathSegment(targetDirectory),
      });
    }
  }

  function onDuplicate() {
    // targetDirectory includes workspace name as first segment (e.g., "workspace/folder/subfolder")
    // Remove it since the API expects paths relative to the workspace root
    dispatch('confirm', {
      shouldCopy: true,
      shouldOverwrite,
      targetPath: removeFirstPathSegment(targetDirectory),
    });
  }
</script>

<Modal height={400} width={380} on:close>
  <ModalHeader on:close>
    Move/Copy Workspace {displayString}
  </ModalHeader>
  <ModalContent style="overflow: hidden;">
    <div class="grid h-full grid-rows-[min-content_auto_min-content] gap-1 overflow-hidden">
      <div>
        <div class="pb-0.5 text-xs">Selected {displayString}:</div>
        <div class="py-1">
          <span class="font-semibold">{getSelectedFilesDisplay(originalNodes.map(({ fullPath }) => fullPath))}</span>
        </div>
      </div>
      <Sidebar.Provider
        style="--sidebar-width: auto"
        className="min-h-full overflow-y-auto rounded-md border-(--st-gray-20) border-2"
      >
        <Sidebar.Content>
          <Sidebar.Menu className="h-full">
            <WorkspaceTreeView
              selectedTreeNodePath={targetDirectory}
              treeNode={currentWorkspaceContents}
              showFiles={false}
              showRootNode={true}
              on:nodeClicked={onFolderClicked}
            />
          </Sidebar.Menu>
        </Sidebar.Content>
      </Sidebar.Provider>
      <div class="flex flex-row-reverse items-center gap-x-2 pt-1">
        <Checkbox name="shouldOverwrite" id="shouldOverwrite" bind:checked={shouldOverwrite} />
        <label class="select-none" for="shouldOverwrite">Overwrite Existing {displayString}</label>
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button
      class="st-button"
      on:click={onMove}
      use:permissionHandler={{
        hasPermission: !selectionHasReadOnlyNodes,
        permissionError: 'Some read-only files selected. You cannot move read-only files.',
      }}
    >
      Move {displayString}
    </button>
    <button class="st-button" on:click={onDuplicate}>
      Copy {displayString}
    </button>
  </ModalFooter>
</Modal>
