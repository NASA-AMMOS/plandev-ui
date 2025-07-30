<svelte:options immutable={true} />

<script lang="ts">
  import { Input as InputStellar, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import InputInternal from '../../components/form/Input.svelte';
  import * as Sidebar from '../../components/ui/Sidebar/index.js';
  import type { User } from '../../types/app';
  import type { Workspace, WorkspaceNodeEvent } from '../../types/workspace';
  import type { WorkspaceTreeNode } from '../../types/workspace-tree-view';
  import { cleanPath, joinPath } from '../../utilities/workspaces';
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

  let filePath: string = joinPath([currentWorkspace?.name ?? '', startingPath]);
  let fileName: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { filePath: string };
  }>();

  function onFolderClicked(event: CustomEvent<WorkspaceNodeEvent>) {
    filePath = event.detail.treeNodePath;
  }

  function onConfirm() {
    dispatch('confirm', {
      filePath: cleanPath(joinPath([filePath.replace(new RegExp(`^${currentWorkspace?.name}`), '.'), fileName])),
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
  <ModalHeader on:close>New File</ModalHeader>
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
              selectedTreeNodePath={filePath}
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
        <Label size="sm" for="file-name">File Name</Label>
        <InputStellar
          sizeVariant="xs"
          id="file-name"
          name="file-name"
          autocomplete="off"
          aria-label="File Name"
          placeholder="Enter file name (e.g. my_sequence.seq)"
          bind:value={fileName}
        />
      </InputInternal>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:click={onConfirm}> Confirm </button>
  </ModalFooter>
</Modal>
