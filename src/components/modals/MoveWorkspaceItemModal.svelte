<svelte:options immutable={true} />

<script lang="ts">
  import { Input, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { WorkspaceContentType } from '../../enums/workspace';
  import type { WorkspaceTreeNode } from '../../types/workspace-tree-view';
  import { separateFilenameFromPath } from '../../utilities/workspaces';
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

  let targetDirectory: string = originalPath;
  let targetFilename: string = '';
  let typeString: string = originalNode.type === WorkspaceContentType.Directory ? 'Directory' : 'File';

  $: {
    const { filename, path } = separateFilenameFromPath(targetDirectory);
    targetDirectory = path;
    targetFilename = filename;
  }

  function onConfirm() {
    dispatch('confirm', { originalNode, originalPath, targetPath: `${targetDirectory}/${targetFilename}` });
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
  <ModalHeader showClose={false}>
    Move Workspace {typeString}
  </ModalHeader>
  <ModalContent>
    <fieldset>
      <Label class="pb-0.5" size="sm" for="original-path">Original Path</Label>
      <Input
        sizeVariant="xs"
        id="original-path"
        name="original-path"
        autocomplete="off"
        value={originalPath}
        disabled
      />
    </fieldset>
    <fieldset>
      <Label class="pb-0.5" size="sm" for="target-path">Target Directory</Label>
      <Input sizeVariant="xs" id="target-path" name="target-path" autocomplete="off" bind:value={targetDirectory} />
    </fieldset>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:click={onConfirm}> Move {typeString} </button>
  </ModalFooter>
</Modal>
