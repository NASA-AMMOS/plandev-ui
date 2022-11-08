<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let actionCanBeUndone: boolean = false;
  export let cancelText: string = 'Cancel';
  export let confirmText: string = 'Yes';
  export let height: number = 150;
  export let message: string = 'Are you sure you want to do this?';
  export let title: string = 'Confirm';
  export let width: number = 380;

  const dispatch = createEventDispatcher();

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      dispatch('confirm');
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
  <ModalHeader on:close>
    {title}
  </ModalHeader>
  <ModalContent>
    <div>{message}</div>
    {#if !actionCanBeUndone}
      <div>This action cannot be undone.</div>
    {/if}
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}>
      {cancelText}
    </button>
    <button class="st-button" on:click={() => dispatch('confirm')}>
      {confirmText}
    </button>
  </ModalFooter>
</Modal>
