<svelte:options accessors={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  export let cancelText: string = 'Cancel';
  export let confirmText: string = 'Yes';
  export let height: number = 150;
  export let message: string = 'Are you sure you want to do this?';
  export let modal: Modal | null = null;
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
  <div class="header">
    <div class="title">{title}</div>
    <button class="st-button icon fs-6" on:click|stopPropagation={modal.hide}>
      <i class="bi bi-x" />
    </button>
  </div>
  <div class="content">
    <div>{message}</div>
    <div>This action cannot be undone.</div>
  </div>
  <div class="footer">
    <button class="st-button secondary" on:click|stopPropagation={modal.hide}>
      {cancelText}
    </button>
    <button class="st-button" on:click={onConfirm}>
      {confirmText}
    </button>
  </div>
</Modal>
