<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { models } from '../../stores/model';
  import { newTemplateActivityTypes, newTemplateModelId } from '../../stores/sequence-template';
  import { parcels } from '../../stores/sequencing';
  import Modal from '../modals/Modal.svelte';
  import ModalContent from '../modals/ModalContent.svelte';
  import ModalFooter from '../modals/ModalFooter.svelte';
  import ModalHeader from '../modals/ModalHeader.svelte';

  const heightNoImport = 380;
  const heightWithImport = 450;

  export let height: number = heightNoImport;
  export let width: number = 380;
  export let initialTemplateName: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
    import: {
      activityType: string;
      language: string;
      modelId: number;
      name: string;
      parcelId: number;
      sequenceTemplateFile: File;
    };
    save: {
      activityType: string;
      language: string;
      modelId: number;
      name: string;
      parcelId: number;
    };
  }>();

  let templateName: string = initialTemplateName;
  let language: string = '';
  let selectedParcelId: number | null = null;
  let selectedActivityType: string = '';
  let showImport: boolean = false;
  let sequenceTemplateUploadFiles: FileList | undefined;
  let sequenceTemplateUploadFileInput: HTMLInputElement;

  $: saveButtonDisabled =
    templateName === '' ||
    language === '' ||
    selectedParcelId === null ||
    $newTemplateModelId === -1 ||
    selectedActivityType === '' ||
    selectedActivityType === null ||
    (showImport && sequenceTemplateUploadFiles === undefined);

  $: height = heightWithImport ? showImport : heightNoImport;

  function save() {
    if (
      !saveButtonDisabled &&
      $newTemplateModelId !== -1 &&
      selectedParcelId !== null &&
      selectedActivityType !== null
    ) {
      if (!showImport) {
        dispatch('save', {
          activityType: selectedActivityType,
          language,
          modelId: $newTemplateModelId,
          name: templateName,
          parcelId: selectedParcelId,
        });
      } else if (sequenceTemplateUploadFiles !== undefined) {
        const sequenceTemplateUploadFile = sequenceTemplateUploadFiles[0];
        if (sequenceTemplateUploadFile !== undefined) {
          dispatch('import', {
            activityType: selectedActivityType,
            language,
            modelId: $newTemplateModelId,
            name: templateName,
            parcelId: selectedParcelId,
            sequenceTemplateFile: sequenceTemplateUploadFile,
          });
        }
      }
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
    <fieldset class="sequence-template-form">
      <label for="name">Template Name</label>
      <input bind:value={templateName} autocomplete="off" class="st-input w-100" id="name" required type="text" />

      <label for="language">Template Language</label>
      <input bind:value={language} autocomplete="off" class="st-input w-100" id="language" required type="text" />

      <label for="parcelId">Parcel ID</label>
      <select name="parcelId" bind:value={selectedParcelId} class="st-select w-100">
        {#if !$parcels.length}
          <option value={null}>No values</option>
        {:else}
          <option value={null} />
          {#each $parcels as parcel}
            <option value={parcel.id}>
              {parcel.name} ({parcel.id})
            </option>
          {/each}
        {/if}
      </select>

      <label for="modelId">Model ID</label>
      <select data-type="number" name="modelId" bind:value={$newTemplateModelId} class="st-select w-100">
        {#if !$models.length}
          <option value={-1}>No values</option>
        {:else}
          <option value={-1} />
          {#each $models as model}
            <option value={model.id}>
              {model.name} ({model.id})
            </option>
          {/each}
        {/if}
      </select>

      <label for="activityType">Activity Type</label>
      <select
        name="activityType"
        bind:value={selectedActivityType}
        class="st-select w-100"
        disabled={$newTemplateModelId === -1}
      >
        {#if !$newTemplateActivityTypes.length}
          <option value={null}>No values</option>
        {:else}
          <option value={null} />
          {#each $newTemplateActivityTypes as activityType}
            <option value={activityType.name}>
              {activityType.name}
            </option>
          {/each}
        {/if}
      </select>

      {#if showImport}
        <label for="file">Imported File</label>
        <div class="import-input-container">
          <input
            class="w-100"
            name="file"
            type="file"
            bind:files={sequenceTemplateUploadFiles}
            bind:this={sequenceTemplateUploadFileInput}
          />
        </div>
      {/if}
    </fieldset>
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button secondary" on:click={() => (showImport = !showImport)}> Import Template </button>
    <button class="st-button" disabled={saveButtonDisabled} on:click={save}> Create Template </button>
  </ModalFooter>
</Modal>

<style>
  .import-input-container {
    column-gap: 0.5rem;
    display: grid;
    grid-template-columns: auto min-content;
  }

  .sequence-template-form {
    gap: 4px;
  }
</style>
