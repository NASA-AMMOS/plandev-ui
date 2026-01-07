<svelte:options immutable={true} />

<script lang="ts">
  import { Input, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean; value?: { newSequenceName: string } };
  }>();

  let newSequenceName: string = '';

  $: confirmButtonDisabled = newSequenceName.trim() === '';

  function handleCancel() {
    open = false;
  }

  function handleConfirm() {
    if (!confirmButtonDisabled) {
      open = false;
      dispatch('resolve', { confirm: true, value: { newSequenceName: newSequenceName.trim() } });
    }
  }

  function onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirm();
    }
  }
</script>

<StellarDialog bind:open size="sm" title="New Sequence" on:close>
  <div class="grid gap-4">
    <div class="grid gap-2">
      <Label size="sm" for="sequence-name">Sequence Name</Label>
      <Input
        sizeVariant="sm"
        bind:value={newSequenceName}
        autocomplete="off"
        id="sequence-name"
        name="sequence-name"
        type="text"
        on:keydown={onInputKeydown}
      />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      confirmDisabled={confirmButtonDisabled}
      on:cancel={handleCancel}
      on:confirm={handleConfirm}
    />
  </svelte:fragment>
</StellarDialog>
