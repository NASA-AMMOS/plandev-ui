<svelte:options immutable={true} />

<script lang="ts">
  import { Checkbox } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { separateFilenameFromPath } from '../../utilities/workspaces';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let targetPath: string;

  let targetFilename: string = targetPath;

  $: {
    const decomposedFilepath = separateFilenameFromPath(targetPath);
    targetFilename = decomposedFilepath.filename;
  }

  const dispatch = createEventDispatcher<{
    confirm: {
      allFiles?: boolean;
      shouldOverwrite?: boolean;
    };
    skip: {
      allFiles?: boolean;
    };
  }>();

  let shouldApplyToAllFiles: boolean = false;

  function onShouldOverwrite() {
    dispatch('confirm', {
      allFiles: shouldApplyToAllFiles,
      shouldOverwrite: true,
    });
  }

  function onShouldKeep() {
    dispatch('confirm', {
      allFiles: shouldApplyToAllFiles,
      shouldOverwrite: false,
    });
  }

  function onShouldSkip() {
    dispatch('skip', {
      allFiles: shouldApplyToAllFiles,
    });
  }
</script>

<Modal height={'auto'} width={380} on:close>
  <ModalHeader showClose={false} on:close>File already exists</ModalHeader>
  <ModalContent style="overflow: hidden;">
    <div class="flex flex-col gap-y-8">
      <div class="pb-0.5 text-sm"><b>{targetFilename}</b> already exists in the target directory.</div>
      <div class="flex flex-row-reverse items-center gap-x-2">
        <Checkbox name="allFiles" id="allFiles" bind:checked={shouldApplyToAllFiles} />
        <label class="select-none" for="allFiles">Apply to all conflicting files?</label>
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button" on:click={onShouldSkip}> Skip File </button>
    <button class="st-button" on:click={onShouldOverwrite}> Overwrite File </button>
    <button class="st-button" on:click={onShouldKeep}> Keep Both Files </button>
  </ModalFooter>
</Modal>
