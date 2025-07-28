<svelte:options immutable={true} />

<script lang="ts">
  import { Input as InputStellar, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import InputInternal from '../../components/form/Input.svelte';
  import * as Sidebar from '../../components/ui/Sidebar/index.js';
  import type { User } from '../../types/app';
  import type { Workspace, WorkspaceNodeEvent } from '../../types/workspace';
  import type { WorkspaceTreeNode } from '../../types/workspace-tree-view';
  import { cleanPath, joinPath } from '../../utilities/workspaces.js';
  import WorkspaceTreeView from '../workspace/WorkspaceTreeView/WorkspaceTreeView.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let currentWorkspace: Workspace | null | undefined = null;
  export let currentWorkspaceContents: WorkspaceTreeNode | null;
  export let height: number = 500;
  export let width: number = 380;
  export let startingPath: string = '';
  export let user: User | null;

  let folderPath: string = joinPath([currentWorkspace?.name ?? '', startingPath]);
  let folderName: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { folderPath: string };
  }>();

  function onFolderClicked(event: CustomEvent<WorkspaceNodeEvent>) {
    folderPath = event.detail.treeNodePath;
  }

  function onConfirm() {
    dispatch('confirm', {
      folderPath: cleanPath(joinPath([folderPath.replace(new RegExp(`^${currentWorkspace?.name}`), '.'), folderName])),
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

<Modal {height} {width}>
  <ModalHeader on:close>New Workspace Folder</ModalHeader>
  <ModalContent style="overflow: hidden;">
    <div class="grid h-full grid-rows-[min-content_auto_min-content_min-content] gap-1 overflow-hidden">
      <div>
        <div class="pb-0.5 text-xs">Current Location:</div>
        <div class="py-1">
          <span class="font-semibold">{joinPath([currentWorkspace?.name ?? '', startingPath])}</span>
        </div>
      </div>
      <Sidebar.Provider
        style="--sidebar-width: auto"
        className="min-h-full overflow-y-auto rounded-md border-(--st-gray-20) border-2"
      >
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
      <InputInternal layout="stacked" class="px-0.5 py-1">
        <Label size="sm" for="folder-name">Folder Name</Label>
        <InputStellar sizeVariant="xs" id="folder-name" name="folder-name" autocomplete="off" bind:value={folderName} />
      </InputInternal>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:click={onConfirm}> Confirm </button>
  </ModalFooter>
</Modal>
