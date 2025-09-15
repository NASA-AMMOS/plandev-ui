<svelte:options immutable={true} />

<script lang="ts">
  import { Input, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { PATH_DELIMITER } from '../../constants/workspaces';
  import { WorkspaceContentType } from '../../enums/workspace';
  import type { WorkspaceTreeNode } from '../../types/workspace-tree-view';
  import { joinPath } from '../../utilities/workspaces';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let originalNode: WorkspaceTreeNode;
  export let originalPath: string;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { originalNode: WorkspaceTreeNode; originalPath: string; targetPath: string };
  }>();

  let originalDirectory: string = '';
  let originalName: string = '';
  let targetName: string = '';
  let typeString: string = originalNode.type === WorkspaceContentType.Directory ? 'Directory' : 'File';

  $: {
    const pathParts = originalPath.split(PATH_DELIMITER);
    originalName = pathParts.pop() ?? '';
    targetName = originalName;
    originalDirectory = pathParts.join(PATH_DELIMITER);
  }

  function onConfirm() {
    dispatch('confirm', { originalNode, originalPath, targetPath: joinPath([originalDirectory, targetName]) });
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

<Modal height={200} width={380}>
  <ModalHeader on:close>
    Rename Workspace {typeString}
  </ModalHeader>
  <ModalContent>
    <fieldset>
      <Label class="pb-0.5" size="sm" for="original-path">Original Name</Label>
      <Input
        sizeVariant="xs"
        id="original-path"
        name="original-path"
        autocomplete="off"
        value={originalName}
        disabled
      />
    </fieldset>
    <fieldset>
      <Label class="pb-0.5" size="sm" for="target-path">New Name</Label>
      <Input sizeVariant="xs" id="target-path" name="target-path" autocomplete="off" bind:value={targetName} />
    </fieldset>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={originalName === targetName} on:click={onConfirm}> Rename {typeString} </button>
  </ModalFooter>
</Modal>
