<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import StellarDialog from './StellarDialog.svelte';

  export let open: boolean = true;
  export let actionRunId: number;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean; value?: number };
  }>();

  function handleClose() {
    open = false;
  }

  function openActionRunResults() {
    open = false;
    dispatch('resolve', { confirm: true, value: actionRunId });
  }
</script>

<StellarDialog bind:open size="auto" className="w-[300px]" title="Action Run Started" on:close>
  <div class="st-typography-label max-h-[50vh] overflow-auto pb-2 py-2">
    Your Action run has started. View results now or Close to return to Sequence Editor.
  </div>
  <svelte:fragment slot="footer">
    <div class="flex w-full justify-end gap-2">
      <button class="st-button secondary" on:click={handleClose}>Close</button>
      <button class="st-button" on:click|stopPropagation={openActionRunResults}>View Results</button>
    </div>
  </svelte:fragment>
</StellarDialog>
