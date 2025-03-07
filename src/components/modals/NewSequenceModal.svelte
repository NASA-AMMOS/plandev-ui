<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 175;
  export let width: number = 300;

  let newSequenceName: string;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { newSequenceName: string };
  }>();

  function onConfirm() {
    dispatch('confirm', { newSequenceName });
  }
</script>

<Modal {height} {width}>
  <ModalHeader on:close>New Sequence</ModalHeader>
  <ModalContent>
    <fieldset>
      <label for="st-typography-body sequence-name">Sequence Name</label>
      <input class="st-input" name="sequence-name" bind:value={newSequenceName} />
    </fieldset>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:click={onConfirm}> Confirm </button>
  </ModalFooter>
</Modal>
