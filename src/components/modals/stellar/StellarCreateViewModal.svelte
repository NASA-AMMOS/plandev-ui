<svelte:options immutable={true} />

<script lang="ts">
  import { Input, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean; value?: { name: string } };
  }>();

  let newViewName: string = '';

  $: createButtonDisabled = newViewName === '';

  function handleCancel() {
    open = false;
  }

  function handleCreate() {
    if (!createButtonDisabled) {
      open = false;
      dispatch('resolve', { confirm: true, value: { name: newViewName } });
    }
  }

  function onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCreate();
    }
  }
</script>

<StellarDialog bind:open size="sm" title="Save new view" on:close>
  <div class="grid gap-4">
    <div class="grid gap-2">
      <Label for="name">View name</Label>
      <Input
        bind:value={newViewName}
        autocomplete="off"
        id="name"
        name="name"
        required
        type="text"
        on:keydown={onInputKeydown}
      />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      confirmText="Save View"
      confirmDisabled={createButtonDisabled}
      on:cancel={handleCancel}
      on:confirm={handleCreate}
    />
  </svelte:fragment>
</StellarDialog>
