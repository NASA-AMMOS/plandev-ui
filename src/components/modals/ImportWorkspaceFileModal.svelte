<svelte:options immutable={true} />

<script lang="ts">
  import { Input as InputStellar } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 200;
  export let width: number = 380;
  export let startingPath: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { files: FileList; targetDirectory: string };
  }>();

  let targetDirectory: string = startingPath;
  let saveButtonDisabled: boolean = false;
  let filesToUpload: FileList;

  $: saveButtonDisabled = filesToUpload?.length === 0;

  function save() {
    if (!saveButtonDisabled) {
      dispatch('confirm', { files: filesToUpload, targetDirectory });
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

  <ModalContent>
    <fieldset>
      <label for="file">File(s)</label>
      <input bind:files={filesToUpload} multiple class="w-100" name="file" type="file" />
    </fieldset>
    <fieldset>
      <div class="st-typography-body">Target Workspace Directory</div>
      <InputStellar sizeVariant="xs" id="folder-path" name="path" autocomplete="off" bind:value={targetDirectory} />
    </fieldset>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={saveButtonDisabled} on:click={save}> Import </button>
  </ModalFooter>
</Modal>
