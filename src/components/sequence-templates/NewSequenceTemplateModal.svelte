<svelte:options immutable={true} />

<script lang="ts">
  import { Input as InputStellar, Label, Select } from '@nasa-jpl/stellar-svelte';
  import { createEventDispatcher } from 'svelte';
  import Field from '../../components/form/Field.svelte';
  import { field } from '../../stores/form';
  import { models } from '../../stores/model';
  import { newTemplateActivityTypes, newTemplateModelId } from '../../stores/sequence-template';
  import { parcels } from '../../stores/sequencing';
  import type { ActivityType } from '../../types/activity';
  import type { ModelSlim } from '../../types/model';
  import type { Parcel } from '../../types/sequencing';
  import { min, required } from '../../utilities/validators';
  import Modal from '../modals/Modal.svelte';
  import ModalContent from '../modals/ModalContent.svelte';
  import ModalFooter from '../modals/ModalFooter.svelte';
  import ModalHeader from '../modals/ModalHeader.svelte';

  const heightNoImport = 380;
  const heightWithImport = 410;
  const importText = 'Import Template';
  const hideImportText = 'Hide Import';

  export let height: number = heightNoImport;
  export let width: number = 380;

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

  let templateNameField = field<string>('', [required]);
  let templateLanguageField = field<string>('', [required]);
  let parcelIdField = field<number>(-1, [min(1, 'Field is required')]);
  let modelIdField = field<number>(-1, [min(1, 'Field is required')]);
  let activityTypeField = field<string>('', [required]);

  let selectedParcel: Parcel | undefined;
  let selectedModel: ModelSlim | undefined;
  let selectedActivityType: ActivityType | undefined;
  let orderedModels: ModelSlim[] = [];

  let showImport: boolean = false;
  let sequenceTemplateUploadFiles: FileList | undefined;
  let sequenceTemplateUploadFileInput: HTMLInputElement;

  $: $newTemplateModelId = $modelIdField.value;
  $: selectedParcel = $parcels.find(({ id }) => $parcelIdField.value === id);
  $: selectedModel = $models.find(({ id }) => $modelIdField.value === id);
  $: selectedActivityType = $newTemplateActivityTypes.find(
    activityType => $activityTypeField.value === activityType.name,
  );

  // sort in descending ID order
  $: orderedModels = [...$models].sort(({ id: idA }, { id: idB }) => {
    if (idA < idB) {
      return 1;
    }
    if (idA > idB) {
      return -1;
    }
    return 0;
  });

  $: saveButtonDisabled =
    $templateNameField.value === '' ||
    $templateLanguageField.value === '' ||
    $parcelIdField.value === -1 ||
    $modelIdField.value === -1 ||
    $activityTypeField.value === '' ||
    (showImport && sequenceTemplateUploadFiles === undefined);

  $: height = showImport ? heightWithImport : heightNoImport;

  function save() {
    if (
      !saveButtonDisabled &&
      $activityTypeField.value !== '' &&
      $templateLanguageField.value !== '' &&
      $modelIdField.value !== -1 &&
      $templateNameField.value !== '' &&
      $parcelIdField.value !== -1
    ) {
      if (!showImport) {
        dispatch('save', {
          activityType: $activityTypeField.value,
          language: $templateLanguageField.value,
          modelId: $newTemplateModelId,
          name: $templateNameField.value,
          parcelId: $parcelIdField.value,
        });
      } else if (sequenceTemplateUploadFiles !== undefined) {
        const sequenceTemplateUploadFile = sequenceTemplateUploadFiles[0];
        if (sequenceTemplateUploadFile !== undefined) {
          dispatch('import', {
            activityType: $activityTypeField.value,
            language: $templateLanguageField.value,
            modelId: $newTemplateModelId,
            name: $templateNameField.value,
            parcelId: $parcelIdField.value,
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

  function getDisplayNameForParcel(parcel?: Parcel) {
    if (!parcel) {
      return '';
    }
    return `${parcel.name} (${parcel.id})`;
  }

  function getDisplayNameForModel(model?: ModelSlim) {
    if (!model) {
      return '';
    }
    return `${model.name} (Version: ${model.version})`;
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
  <ModalHeader on:close>Create Sequence Template</ModalHeader>

  <ModalContent>
    <Field field={templateNameField}>
      <Label size="sm" for="template-name" class="pb-0.5">Template Name</Label>
      <InputStellar id="template-name" autocomplete="off" sizeVariant="xs" name="name" aria-label="name" />
    </Field>

    <Field field={templateLanguageField}>
      <Label size="sm" for="template-language" class="pb-0.5">Template Language</Label>
      <InputStellar id="template-language" autocomplete="off" sizeVariant="xs" name="language" aria-label="language" />
    </Field>

    <Field field={parcelIdField}>
      <Label size="sm" for="parcel-id" class="pb-0.5">Parcel Id</Label>
      <Select.Root selected={{ label: getDisplayNameForParcel(selectedParcel), value: selectedParcel?.id ?? '' }}>
        <Select.Trigger class="min-w-[124px]" value={selectedParcel?.id} size="xs" aria-labelledby={null}>
          <Select.Value aria-label="Select a parcel" placeholder="Select a parcel" />
        </Select.Trigger>
        <Select.Content class="z-[10000]">
          {#each $parcels as parcel}
            <Select.Item size="xs" value={parcel.id} label={getDisplayNameForParcel(parcel)} class="flex gap-1">
              {parcel.name}
              <div class="whitespace-nowrap text-muted-foreground">(Id: {parcel.id})</div>
            </Select.Item>
          {/each}
        </Select.Content>
        <Select.Input type="number" name="parcel-id" aria-label="Select Parcel hidden input" />
      </Select.Root>
    </Field>

    <Field field={modelIdField}>
      <Label size="sm" for="model" class="pb-0.5">Model</Label>
      <Select.Root selected={{ label: getDisplayNameForModel(selectedModel), value: selectedModel?.id ?? '' }}>
        <Select.Trigger value={selectedModel?.id} size="xs" aria-label="Select Model" aria-labelledby={null} id="model">
          <Select.Value aria-label="Select a model" placeholder="Select a model" />
        </Select.Trigger>
        <Select.Content
          class="z-[10000] min-w-[240px] overflow-auto p-0"
          sameWidth={false}
          align="start"
          datatype="number"
          fitViewport
        >
          {#each orderedModels as model (model.id)}
            <Select.Item size="xs" value={model.id} label={getDisplayNameForModel(model)} class="flex gap-1">
              {model.name}
              <div class="whitespace-nowrap text-muted-foreground">(Version: {model.version})</div>
            </Select.Item>
          {/each}
        </Select.Content>
        <Select.Input type="number" name="model" aria-label="Select Model hidden input" />
      </Select.Root>
    </Field>

    <Field field={activityTypeField}>
      <Label size="sm" for="activity-type" class="pb-0.5">Activity Type</Label>
      <Select.Root
        selected={{ label: selectedActivityType?.name ?? '', value: selectedActivityType?.name ?? '' }}
        disabled={$newTemplateModelId === -1}
      >
        <Select.Trigger class="min-w-[124px]" value={selectedActivityType?.name} size="xs" aria-labelledby={null}>
          <Select.Value aria-label="Select an activity type" placeholder="Select an activity type" />
        </Select.Trigger>
        <Select.Content class="z-[10000] max-h-48 overflow-y-scroll">
          {#each $newTemplateActivityTypes as activityType}
            <Select.Item size="xs" value={activityType.name} label={activityType.name} class="flex gap-1">
              {activityType.name}
            </Select.Item>
          {/each}
        </Select.Content>
        <Select.Input type="string" name="activity-type" aria-label="Select Activity Type hidden input" />
      </Select.Root>
    </Field>

    {#if showImport}
      <fieldset>
        <Label class="pb-0.5" size="sm" for="sequence-template-file">Sequence Template File</Label>
        <!-- TODO consider porting the input files fix to stellar https://github.com/huntabyte/shadcn-svelte/pull/1700/files -->
        <input
          class="leading-1 flex h-6 w-full cursor-pointer content-center rounded-md border border-input px-2 pl-0 text-xs leading-5 ring-offset-background file:cursor-pointer file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          name="Sequence Template File"
          id="sequence-template-file"
          type="file"
          bind:files={sequenceTemplateUploadFiles}
          bind:this={sequenceTemplateUploadFileInput}
        />
      </fieldset>
    {/if}
  </ModalContent>

  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button secondary" on:click={() => (showImport = !showImport)}>
      {showImport ? hideImportText : importText}
    </button>
    <button class="st-button" disabled={saveButtonDisabled} on:click={save}> Create Template </button>
  </ModalFooter>
</Modal>
