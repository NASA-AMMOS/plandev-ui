<svelte:options immutable={true} />

<script lang="ts">
  import { Checkbox } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let targetPath: string;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: {
      allFiles?: boolean;
      shouldOverwrite?: boolean;
      shouldSkip?: boolean;
    };
  }>();

  let shouldApplyToAllFiles: boolean = false;

  function onShouldOverwrite() {
    dispatch('confirm', {
      allFiles: shouldApplyToAllFiles,
      shouldOverwrite: true,
    });
  }

  function onShouldSkip() {
    dispatch('confirm', {
      allFiles: shouldApplyToAllFiles,
      shouldSkip: true,
    });
  }
</script>

<Modal height={'auto'} width={380} on:close>
  <ModalHeader on:close>File already exists</ModalHeader>
  <ModalContent style="overflow: hidden;">
    <div class="flex flex-col gap-y-8">
      <div class="pb-0.5 text-sm"><b>{targetPath}</b> already exists in the target directory.</div>
      <div class="flex flex-row-reverse items-center gap-x-2">
        <Checkbox name="allFiles" id="allFiles" bind:checked={shouldApplyToAllFiles} />
        <label class="select-none" for="allFiles">Apply to all conflicting files?</label>
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:click={onShouldOverwrite}> Overwrite File </button>
    <button class="st-button" on:click={onShouldSkip}> Skip File </button>
  </ModalFooter>
</Modal>
