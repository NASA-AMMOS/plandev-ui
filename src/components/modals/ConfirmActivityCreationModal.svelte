<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 150;
  export let width: number = 380;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: { addFilter: boolean };
  }>();

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      confirm(true);
    }
  }

  function confirm(addFilter: boolean = false) {
    dispatch('confirm', { addFilter });
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
  <ModalHeader on:close>Warning</ModalHeader>
  <ModalContent>
    <span>This row is not configured to display some of the activities you are trying to create.</span>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button secondary" on:click={() => confirm()}> Create Anyway </button>
    <button class="st-button" on:click={() => confirm(true)}> Create and Add as Filter</button>
  </ModalFooter>
</Modal>
