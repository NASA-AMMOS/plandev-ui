<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 200;
  export let width: number = 380;
  export let itemsToDelete: string[];
  export let itemsToDeleteTypeName: 'External Event Type(s)' | 'External Source Type(s)';
  export let associatedItems: Set<string>;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: void;
  }>();

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
    {#if associatedItems.size > 0}
      {itemsToDeleteTypeName} Cannot Be Deleted
    {:else}
      Delete {itemsToDeleteTypeName}
    {/if}
  </ModalHeader>
  <div class="modal-body">
    <ModalContent>
      {#if associatedItems.size > 0}
        <span class="st-typography-body">
          All External Sources/Derivation Groups using the {itemsToDeleteTypeName} must be deleted first. The following {itemsToDeleteTypeName}
          are still in use:
          {#each associatedItems as associatedItem}
            <ul class="modal-content-text">
              <li>
                {associatedItem}
              </li>
            </ul>
          {/each}
        </span>
      {:else}
        <span class="st-typography-body modal-content-text">
          Are you sure you want to delete the following {itemsToDeleteTypeName}:
          <ul class="modal-content-text">
            {#each itemsToDelete as itemToDelete}
              <li>
                {itemToDelete}
              </li>
            {/each}
          </ul>
          <i>This action cannot be undone.</i>
        </span>
      {/if}
    </ModalContent>
  </div>
  <ModalFooter>
    {#if associatedItems.size > 0}
      <button class="st-button" on:click={() => dispatch('close')}> Close </button>
    {:else}
      <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
      <button class="st-button" on:click={() => dispatch('confirm')}> Delete </button>
    {/if}
  </ModalFooter>
</Modal>

<style>
  .modal-body {
    height: 100%;
    overflow: auto;
  }
  .modal-content-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .modal-content-text > li {
    font-style: italic;
  }
</style>
