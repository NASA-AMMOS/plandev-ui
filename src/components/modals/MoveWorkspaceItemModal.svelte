<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import * as Sidebar from '../../components/ui/Sidebar/index.js';
  import { WorkspaceContentType } from '../../enums/workspace';
  import type { User } from '../../types/app';
  import type { Workspace, WorkspaceNodeEvent } from '../../types/workspace';
  import type { WorkspaceTreeNode } from '../../types/workspace-tree-view';
  import { joinPath, separateFilenameFromPath } from '../../utilities/workspaces';
  import WorkspaceTreeView from '../workspace/WorkspaceTreeView/WorkspaceTreeView.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let currentWorkspace: Workspace;
  export let currentWorkspaceContents: WorkspaceTreeNode | null;
  export let originalNode: WorkspaceTreeNode;
  export let originalPath: string;
  export let workspace: Workspace | null | undefined = null;
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { originalNode: WorkspaceTreeNode; originalPath: string; targetPath: string };
  }>();

  let targetPath: string = joinPath([currentWorkspace.name, originalPath]);
  let targetDirectory: string = '';
  let targetFilename: string = '';
  let typeString: string = originalNode.type === WorkspaceContentType.Directory ? 'Directory' : 'File';

  $: {
    const { filename, path } = separateFilenameFromPath(targetPath);
    targetDirectory = path;
    targetFilename = filename;
  }

  function onFolderClicked(event: CustomEvent<WorkspaceNodeEvent>) {
    targetDirectory = event.detail.treeNodePath;
  }

  function onConfirm() {
    dispatch('confirm', {
      originalNode,
      originalPath,
      targetPath: joinPath([targetDirectory.replace(new RegExp(`^${currentWorkspace.name}`), '.'), targetFilename]),
    });
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      onConfirm();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal height={400} width={380}>
  <ModalHeader showClose={false}>
    Move Workspace {typeString}
  </ModalHeader>
  <ModalContent style="overflow: hidden;">
    <div class="grid h-full grid-rows-[min-content_auto_min-content] gap-1 overflow-hidden">
      <div>
        <div class="pb-0.5 text-xs">Current Location:</div>
        <div class="py-1"><span class="font-semibold">{originalPath}</span></div>
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
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:click={onConfirm}> Move {typeString} </button>
  </ModalFooter>
</Modal>
