<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let itemsToDelete: string[];
  export let itemsToDeleteTypeName: 'External Event Type(s)' | 'External Source Type(s)';
  export let associatedItems: Set<string>;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean };
  }>();

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
  }

  function handleCancel() {
    open = false;
  }

  function handleConfirm() {
    open = false;
    dispatch('resolve', { confirm: true });
  }
</script>

<svelte:window on:keydown={onKeydown} />

<StellarDialog
  bind:open
  size="sm"
  title={associatedItems.size > 0
    ? `${itemsToDeleteTypeName} Cannot Be Deleted`
    : `Delete ${itemsToDeleteTypeName}`}
  on:close
>
  <div class="modal-body overflow-auto py-2">
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
  </div>
  <svelte:fragment slot="footer">
    {#if associatedItems.size > 0}
      <button class="st-button" on:click={handleCancel}>Close</button>
    {:else}
      <StellarDialogActionButtons
        cancelText="Cancel"
        confirmText="Delete"
        on:cancel={handleCancel}
        on:confirm={handleConfirm}
      />
    {/if}
  </svelte:fragment>
</StellarDialog>

<style>
  .modal-body {
    height: 100%;
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
