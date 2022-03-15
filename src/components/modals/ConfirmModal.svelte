<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let cancelText: string = 'Cancel';
  export let confirmText: string = 'Yes';
  export let height: number = 150;
  export let message: string = 'Are you sure you want to do this?';
  export let modal: Modal;
  export let title: string = 'Confirm';
  export let width: number = 350;

  const dispatch = createEventDispatcher();

  function onConfirm() {
    dispatch('confirm', { ...modal.context });
    modal.hide();
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter' && modal.shown) {
      event.preventDefault();
      dispatch('confirm', { ...modal.context });
      modal.hide();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal bind:this={modal} {height} {width}>
  <ModalHeader on:close={modal.hide}>
    {title}
  </ModalHeader>
  <ModalContent>
    <div>{message}</div>
    <div>This action cannot be undone.</div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click|stopPropagation={modal.hide}>
      {cancelText}
    </button>
    <button class="st-button" on:click={onConfirm}>
      {confirmText}
    </button>
  </ModalFooter>
</Modal>
