<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ExternalEventType } from '../../types/external-event';
  import type { ExternalSourceType } from '../../types/external-source';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 200;
  export let width: number = 380;
  export let itemToDelete: ExternalEventType | ExternalSourceType;
  export let itemToDeleteTypeName: 'External Event Type' | 'External Source Type';
  export let associatedItems: string[] = [];

  // Used to display text - event types always are associated to sources in this context, and sources are always associated to derivation groups
  const associatedItemTypeName: string =
    itemToDeleteTypeName === 'External Event Type' ? 'External Source' : 'Derivation Group';

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
    {#if associatedItems.length > 0}
      {itemToDeleteTypeName} Cannot Be Deleted
    {:else}
      Delete {itemToDeleteTypeName}
    {/if}
  </ModalHeader>
  <div class="modal-body">
    <ModalContent>
      {#if associatedItems.length > 0}
        <span class="st-typography-body">
          This {itemToDeleteTypeName} still contains the following related {associatedItemTypeName} which must be deleted
          first:
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
          Are you sure you want to delete "{itemToDelete.name}"?
          <i>This action cannot be undone.</i>
        </span>
      {/if}
    </ModalContent>
  </div>
  <ModalFooter>
    {#if associatedItems.length > 0}
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
