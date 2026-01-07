<svelte:options immutable={true} />

<script lang="ts">
  import { Label } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import { parcels } from '../../../stores/sequencing';
  import StellarDialog from './StellarDialog.svelte';
  import StellarDialogActionButtons from './StellarDialogActionButtons.svelte';

  export let open: boolean = true;

  const dispatch = createEventDispatcher<{
    close: void;
    resolve: { confirm: boolean; value?: { library: FileList; parcel: number } };
  }>();

  let libraryName: FileList;
  let parcelId: number;

  $: saveButtonDisabled = parcelId === null || libraryName === undefined;

  function handleCancel() {
    open = false;
  }

  function handleSave() {
    if (!saveButtonDisabled) {
      open = false;
      dispatch('resolve', { confirm: true, value: { library: libraryName, parcel: parcelId } });
    }
  }
</script>

<StellarDialog bind:open size="sm" title="Import Library" on:close>
  <div class="grid gap-4 py-2">
    <div class="grid gap-2">
      <Label for="parcel">Parcel (required)</Label>
      <select
        bind:value={parcelId}
        id="parcel"
        name="parcel"
        class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value={null} />
        {#each $parcels as parcel}
          <option value={parcel.id}>
            {parcel.name}
          </option>
        {/each}
      </select>
    </div>
    <div class="grid gap-2">
      <Label for="library">Imported Library</Label>
      <input
        bind:files={libraryName}
        id="library"
        name="libraryFile"
        type="file"
        accept=".satf"
        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  </div>
  <svelte:fragment slot="footer">
    <StellarDialogActionButtons
      confirmText="Import"
      confirmDisabled={saveButtonDisabled}
      on:cancel={handleCancel}
      on:confirm={handleSave}
    />
  </svelte:fragment>
</StellarDialog>
