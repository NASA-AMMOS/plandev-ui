<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from '../modals/Modal.svelte';
  import ModalContent from '../modals/ModalContent.svelte';
  import ModalFooter from '../modals/ModalFooter.svelte';
  import ModalHeader from '../modals/ModalHeader.svelte';

  export let height: number = 300;
  export let width: number = 380;
  export let initialTemplateName: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
    save: { name: string; parcel_id: number; model_id: number; activity_name: string };
  }>();

  let templateName: string = initialTemplateName;
  let parcel_id: number = -1;
  let model_id: number = -1;
  let activity_name: string = '';
  let saveButtonDisabled: boolean = true;

  // TODO: Add logic to disallow saving a name already in use
  $: saveButtonDisabled = templateName === '';

  function save() {
    if (!saveButtonDisabled) {
      dispatch('save', { name: templateName, parcel_id, model_id, activity_name });
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
  <ModalHeader on:close>Create Sequence Template</ModalHeader>

  <ModalContent>
    <fieldset>
      <label for="name">Template name</label>
      <input bind:value={templateName} autocomplete="off" class="st-input w-100" id="name" required type="text" />

      <!-- TODO: make these pickers of some kind, rather than a raw ID input -->
      <label for="parcel_id">Parcel ID</label>
      <input bind:value={parcel_id} autocomplete="off" class="st-input w-100" id="parcel_id" required type="number" />

      <label for="model_id">Model ID</label>
      <input bind:value={model_id} autocomplete="off" class="st-input w-100" id="model_id" required type="number" />

      <label for="activity_name">Activity Name</label>
      <input
        bind:value={activity_name}
        autocomplete="off"
        class="st-input w-100"
        id="activity_name"
        required
        type="text"
      />
    </fieldset>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" disabled={saveButtonDisabled} on:click={save}> Create Template </button>
  </ModalFooter>
</Modal>
