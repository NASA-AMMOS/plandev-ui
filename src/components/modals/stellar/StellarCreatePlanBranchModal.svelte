<svelte:options immutable={true} />

<script lang="ts">
  import { Input, Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import type { Plan } from '../../../types/plan';
  import DatePicker from '../../ui/DatePicker/DatePicker.svelte';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;
  export let plan: Plan;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean; value?: { name: string; plan: Plan } };
  }>();

  let newBranchName: string = '';

  $: createButtonDisabled = newBranchName.trim() === '';

  function handleCancel() {
    open = false;
  }

  function handleCreate() {
    if (!createButtonDisabled) {
      open = false;
      dispatch('resolve', { confirm: true, value: { name: newBranchName.trim(), plan } });
    }
  }

  function onInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCreate();
    }
  }
</script>

<StellarDialog bind:open size="sm" title="Create Branch" on:close>
  <div class="grid gap-4">
    <div class="grid gap-2">
      <Label for="name">Name of branch</Label>
      <Input
        bind:value={newBranchName}
        placeholder="Name of branch"
        autocomplete="off"
        id="name"
        name="name"
        required
        type="text"
        on:keydown={onInputKeydown}
      />
    </div>
    <div class="grid gap-2">
      <Label for="start">Start date</Label>
      <DatePicker name="start" disabled dateString={plan.start_time_doy} />
    </div>
    <div class="grid gap-2">
      <Label for="end">End date</Label>
      <DatePicker name="end" disabled dateString={plan.end_time_doy} />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      confirmText="Create Branch"
      confirmDisabled={createButtonDisabled}
      on:cancel={handleCancel}
      on:confirm={handleCreate}
    />
  </svelte:fragment>
</StellarDialog>
