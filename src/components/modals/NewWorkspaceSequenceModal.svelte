<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 175;
  export let width: number = 300;
  export let startingPath: string = '';

  let sequencePath: string = startingPath;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { sequencePath: string };
  }>();

  function onConfirm() {
    dispatch('confirm', { sequencePath });
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
  <ModalContent>
    <fieldset>
      <label for="st-typography-body sequence-name">Sequence Path</label>
      <input class="st-input" name="sequence-name" autocomplete="off" bind:value={sequencePath} />
    </fieldset>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:click={onConfirm}> Confirm </button>
  </ModalFooter>
</Modal>
