<svelte:options immutable={true} />

<script lang="ts">
  import { Input as InputStellar, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import * as Sidebar from '../../components/ui/Sidebar/index.js';
  import type { User } from '../../types/app';
  import type { Workspace, WorkspaceNodeEvent } from '../../types/workspace';
  import type { WorkspaceTreeNode } from '../../types/workspace-tree-view';
  import { joinPath } from '../../utilities/workspaces';
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

  let sequencePath: string = joinPath([currentWorkspace?.name ?? '', startingPath]);
  let sequenceName: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { sequencePath: string };
  }>();

  function onFolderClicked(event: CustomEvent<WorkspaceNodeEvent>) {
    sequencePath = event.detail.treeNodePath;
  }

  function onConfirm() {
    dispatch('confirm', {
      sequencePath: joinPath([sequencePath.replace(new RegExp(`^${currentWorkspace?.name}`), '.'), sequenceName]),
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
  <ModalHeader on:close>New Sequence</ModalHeader>
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
              selectedTreeNodePath={sequencePath}
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
      <fieldset>
        <Label class="pb-0.5" size="sm" for="sequence-name">Sequence Name</Label>
        <InputStellar
          sizeVariant="xs"
          id="sequence-name"
          name="sequence-name"
          autocomplete="off"
          aria-label="Sequence Name"
          bind:value={sequenceName}
        />
      </fieldset>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:click={onConfirm}> Confirm </button>
  </ModalFooter>
</Modal>
