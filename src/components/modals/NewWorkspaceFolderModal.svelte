<svelte:options immutable={true} />

<script lang="ts">
  import { Input as InputStellar, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 175;
  export let width: number = 300;

  let folderPath: string;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { folderPath: string };
  }>();

  function onConfirm() {
    dispatch('confirm', { folderPath });
  }
</script>

<Modal {height} {width}>
  <ModalHeader on:close>New Workspace Folder</ModalHeader>
  <ModalContent>
    <fieldset>
      <Label class="pb-0.5" size="sm" for="folder-path">Folder Path</Label>
      <InputStellar sizeVariant="xs" id="folder-path" name="path" autocomplete="off" bind:value={folderPath} />
    </fieldset>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:click={onConfirm}> Confirm </button>
  </ModalFooter>
</Modal>
