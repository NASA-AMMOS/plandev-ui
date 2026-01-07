<svelte:options immutable={true} />

<script lang="ts">
  import { Input, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let viewId: number | undefined = undefined;
  export let viewName: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean; value?: { id: number | undefined; name: string } };
  }>();

  let editedViewName: string = viewName;

  $: saveButtonDisabled = editedViewName.trim() === '';

  function handleCancel() {
    open = false;
  }

  function handleSave() {
    if (!saveButtonDisabled) {
      open = false;
      dispatch('resolve', { confirm: true, value: { id: viewId, name: editedViewName.trim() } });
    }
  }

  function onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSave();
    }
  }
</script>

<StellarDialog bind:open size="sm" title="Edit view" on:close>
  <div class="grid gap-4">
    <div class="grid gap-2">
      <Label for="name">View name</Label>
      <Input
        bind:value={editedViewName}
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
      confirmDisabled={saveButtonDisabled}
      on:cancel={handleCancel}
      on:confirm={handleSave}
    />
  </svelte:fragment>
</StellarDialog>
