<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { parcels, workspaces } from '../../stores/sequencing';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 200;
  export let width: number = 380;

  const dispatch = createEventDispatcher<{
    close: void;
    save: { parcelId: number; workspaceId: number };
  }>();

  let workspaceId: number = -1;
  let parcelId: number = -1;

  let saveButtonDisabled: boolean = true;

  $: saveButtonDisabled = workspaceId === -1 || parcelId === -1;

  function save() {
    if (!saveButtonDisabled) {
      dispatch('save', { parcelId, workspaceId });
    }
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      save();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
  <ModalHeader on:close>Send Expansion Result To Sequencing</ModalHeader>

  <ModalContent>
    <div class="st-typography-body">Select a workspace and parcel to use for sequencing.</div>

    <fieldset>
      <label for="workspaceId">Workspace ID</label>
      <select data-type="number" name="workspaceId" bind:value={workspaceId} class="st-select w-100">
        {#if !$workspaces.length}
          <option value={-1}>No values</option>
        {:else}
          <option value={-1} />
          {#each $workspaces as workspace}
            <option value={workspace.id}>
              {workspace.name} ({workspace.id})
            </option>
          {/each}
        {/if}
      </select>

      <label for="parcelId">Parcel ID</label>
      <select data-type="number" name="parcelId" bind:value={parcelId} class="st-select w-100">
        {#if !$parcels.length}
          <option value={-1}>No values</option>
        {:else}
          <option value={-1} />
          {#each $parcels as parcel}
            <option value={parcel.id}>
              {parcel.name} ({parcel.id})
            </option>
          {/each}
        {/if}
      </select>
    </fieldset>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={saveButtonDisabled} on:click={save}> Save </button>
  </ModalFooter>
</Modal>
