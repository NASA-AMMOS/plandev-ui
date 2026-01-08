<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean; value?: { addFilter: boolean } };
  }>();

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      confirm(true);
    }
  }

  function confirm(addFilter: boolean = false) {
    open = false;
    dispatch('resolve', { confirm: true, value: { addFilter } });
  }

  function handleCancel() {
    open = false;
  }
</script>

<svelte:window on:keydown={onKeydown} />

<StellarDialog bind:open size="sm" title="Warning" on:close>
  <div class="py-2">
    <span>This row is not configured to display some of the activities you are trying to create.</span>
  </div>
  <svelte:fragment slot="footer">
    <div class="flex w-full justify-end gap-2">
      <button class="st-button secondary" on:click={handleCancel}>Cancel</button>
      <button class="st-button secondary" on:click={() => confirm()}>Create Anyway</button>
      <button class="st-button" on:click={() => confirm(true)}>Create and Add as Filter</button>
    </div>
  </svelte:fragment>
</StellarDialog>
