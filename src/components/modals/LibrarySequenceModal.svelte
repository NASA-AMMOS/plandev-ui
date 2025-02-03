<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { parcels } from '../../stores/sequencing';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 200;
  export let width: number = 380;

  const dispatch = createEventDispatcher<{
    close: void;
    save: { library: FileList; parcel: number };
  }>();

  let saveButtonDisabled: boolean = true;
  let modalTitle: string;
  let libraryName: FileList;
  let parcelId: number;

  $: saveButtonDisabled = parcelId === null || libraryName === undefined;
  $: modalTitle = 'Import Library';

  function save() {
    if (!saveButtonDisabled) {
      dispatch('save', { library: libraryName, parcel: parcelId });
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
  <ModalHeader on:close>{modalTitle}</ModalHeader>

  <ModalContent>
    <div class="st-typography-body">Parcel (required)</div>
    <select bind:value={parcelId} class="st-select w-100" name="parcel">
      <option value={null} />
      {#each $parcels as parcel}
        <option value={parcel.id}>
          {parcel.name}
        </option>
      {/each}
    </select>
    <fieldset>
      <label for="name">Imported Library</label>
      <input bind:files={libraryName} class="w-100" name="libraryFile" type="file" accept=".satf" />
    </fieldset>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={saveButtonDisabled} on:click={save}> Import </button>
  </ModalFooter>
</Modal>
