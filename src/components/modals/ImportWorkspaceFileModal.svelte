<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import * as Sidebar from '../../components/ui/Sidebar/index.js';
  import type { User } from '../../types/app';
  import type { Workspace, WorkspaceNodeEvent } from '../../types/workspace';
  import type { WorkspaceTreeNode } from '../../types/workspace-tree-view';
  import { cleanPath, joinPath, separateFilenameFromPath } from '../../utilities/workspaces.js';
  import WorkspaceTreeView from '../workspace/WorkspaceTreeView/WorkspaceTreeView.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let currentWorkspace: Workspace;
  export let currentWorkspaceContents: WorkspaceTreeNode | null;
  export let height: number = 400;
  export let width: number = 380;
  export let startingPath: string = '';
  export let workspace: Workspace | null | undefined = null;
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { files: FileList; targetDirectory: string };
  }>();

  let targetPath: string = joinPath([currentWorkspace.name, startingPath]);
  let targetDirectory: string = startingPath;
  let targetFilename: string = '';
  let saveButtonDisabled: boolean = false;
  let filesToUpload: FileList;

  $: {
    const { filename, path } = separateFilenameFromPath(targetPath);
    targetDirectory = path;
    targetFilename = filename;
  }
  $: saveButtonDisabled = filesToUpload?.length === 0;

  function onFolderClicked(event: CustomEvent<WorkspaceNodeEvent>) {
    targetDirectory = event.detail.treeNodePath;
  }

  function save() {
    if (!saveButtonDisabled) {
      dispatch('confirm', {
        files: filesToUpload,
        targetDirectory: cleanPath(
          joinPath([targetDirectory.replace(new RegExp(`^${currentWorkspace.name}`), ''), targetFilename]),
        ),
      });
    }
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      save();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
  <ModalHeader on:close>Upload File(s) To Workspace</ModalHeader>

  <ModalContent style="overflow: hidden;">
    <div class="grid h-full grid-rows-[auto_min-content] gap-1 overflow-hidden">
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
      <div class="py-1">
        <label class="block pb-0.5" for="file">File(s)</label>
        <input bind:files={filesToUpload} multiple class="w-100" name="file" type="file" aria-label="File(s)" />
      </div>
    </div>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={saveButtonDisabled} on:click={save}> Upload </button>
  </ModalFooter>
</Modal>
