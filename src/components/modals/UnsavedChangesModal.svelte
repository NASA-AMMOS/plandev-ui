<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let cancelText: string = 'Keep Editing';
  export let discardText: string = 'Discard and Navigate';
  export let height: number | string = 'auto';
  export let message: string = 'There are unsaved changes.';
  export let saveText: string = 'Save and Navigate';
  export let title: string = 'Unsaved Changes';
  export let width: number = 480;

  const dispatch = createEventDispatcher<{
    close: void;
    discard: void;
    save: void;
  }>();

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      dispatch('save');
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width} on:close>
  <ModalHeader on:close>
    {title}
  </ModalHeader>
  <ModalContent>
    <span>{message}</span>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}>
      {cancelText}
    </button>
    <button
      class="st-button bg-destructive text-destructive-foreground hover:!bg-destructive/90"
      on:click={() => dispatch('discard')}
    >
      {discardText}
    </button>
    <button class="st-button" on:click={() => dispatch('save')}>
      {saveText}
    </button>
  </ModalFooter>
</Modal>
