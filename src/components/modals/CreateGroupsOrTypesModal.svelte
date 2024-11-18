<svelte:options immutable={true} />

<script lang="ts">
  import type { SchemaObject } from 'ajv';
  import { createEventDispatcher } from 'svelte';
  import { createExternalEventTypeError, resetExternalEventStores } from '../../stores/external-event';
  import { createExternalSourceTypeError, resetExternalSourceStores } from '../../stores/external-source';
  import type { User } from '../../types/app';
  import type { RadioButtonId } from '../../types/radio-buttons';
  import effects from '../../utilities/effects';
  import { parseJSONStream } from '../../utilities/generic';
  import { featurePermissions } from '../../utilities/permissions';
  import AlertError from '../ui/AlertError.svelte';
  import RadioButton from '../ui/RadioButtons/RadioButton.svelte';
  import RadioButtons from '../ui/RadioButtons/RadioButtons.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();
  const EXTERNAL_EVENT_TYPE = 'External Event Type';
  const EXTERNAL_SOURCE_TYPE = 'External Source Type';

  let definitionType: RadioButtonId = EXTERNAL_EVENT_TYPE;
  let newTypeName: string = '';
  let newTypeError: string | null = null;
  let fileInput: HTMLInputElement;
  let errors: string[] = [];
  let files: FileList | undefined;
  let file: File | undefined;
  let parsedJSONSchema: SchemaObject | undefined;

  let hasCreateExternalSourceTypePermission: boolean = false;
  let hasCreateExternalEventTypePermission: boolean = false;
  let hasCreationPermission: boolean = false;

  $: hasCreateExternalSourceTypePermission = featurePermissions.externalSourceType.canCreate(user);
  $: hasCreateExternalEventTypePermission = featurePermissions.externalEventType.canCreate(user);
  $: hasCreationPermission = hasCreateExternalEventTypePermission && hasCreateExternalSourceTypePermission;

  function onClick() {
    fileInput.value = '';
    errors = [];
  }

  function handleChange() {
    resetExternalSourceStores();
    resetExternalEventStores();
    newTypeError = null;
  }

  async function handleUpload() {
    if (files) {
      file = files[0];
      if (file !== undefined && /\.json$/.test(file.name)) {
        errors = [];
        parsedJSONSchema = await parseJSONStream<object>(file.stream());
        if (definitionType === EXTERNAL_EVENT_TYPE) {
          const creationResponse = await effects.createExternalEventType(newTypeName, parsedJSONSchema, user);
          if (creationResponse !== null) {
            dispatch('close');
          }
        } else if (definitionType === EXTERNAL_SOURCE_TYPE) {
          const creationResponse = await effects.createExternalSourceType(newTypeName, parsedJSONSchema, user);
          console.log(creationResponse);
          if (creationResponse !== null) {
            dispatch('close');
          }
        }
        newTypeName = '';
        files = undefined;
        file = undefined;
        fileInput.value = '';
      }
    }
  }

  function onSelectDefinitionType(event: CustomEvent<{ id: RadioButtonId }>) {
    const {
      detail: { id },
    } = event;
    definitionType = id;
  }
</script>

<Modal height={400} width={600}>
  <ModalHeader on:close>Create New External Source/Event Types</ModalHeader>
  <ModalContent style="overflow: auto;">
    <div class="creation-modal-container">
      <div class="type-creation-input">
        <RadioButtons selectedButtonId={definitionType} on:select-radio-button={onSelectDefinitionType}>
          <RadioButton id={EXTERNAL_EVENT_TYPE}>
            <div class="definition-type-button">
              <span>{EXTERNAL_EVENT_TYPE}</span>
            </div>
          </RadioButton>
          <RadioButton id={EXTERNAL_SOURCE_TYPE}>
            <div class="definition-type-button">
              <span>{EXTERNAL_SOURCE_TYPE}</span>
            </div>
          </RadioButton>
        </RadioButtons>
      </div>
      <div class="type-creation-input">
        <input
          bind:value={newTypeName}
          on:change={handleChange}
          autocomplete="off"
          class="st-input w-100"
          placeholder="New Type Name"
        />
      </div>

      <div class="type-creation-input">
        <label for="file">Type JSON Schema File</label>
        <input
          bind:this={fileInput}
          class="w-100 upload"
          class:error={!!errors.length}
          name="file"
          required
          type="file"
          accept="application/json"
          bind:files
          on:click={onClick}
        />
      </div>

      <div class="errors">
        {#each errors as currentError}
          <AlertError class="m-2" error={currentError} />
        {/each}
        <AlertError class="m-2" error={newTypeError} />
        <AlertError class="m-2" error={$createExternalSourceTypeError} />
        <AlertError class="m-2" error={$createExternalEventTypeError} />
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Close </button>
    <button class="st-button primary" disabled={!hasCreationPermission} on:click={handleUpload}> Create </button>
  </ModalFooter>
</Modal>

<style>
  :global(.tab-list.creation-tabs-list) {
    background-color: var(--st-gray-10);
  }

  :global(button.creation-tab) {
    align-items: center;
    gap: 8px;
    text-align: center;
    width: 33%;
  }

  :global(button.creation-tab:last-of-type) {
    flex: 1;
  }
  :global(button.creation-tab:last-of-type.selected) {
    box-shadow: 1px 0px 0px inset var(--st-gray-20);
  }

  :global(button.creation-tab:first-of-type.selected) {
    box-shadow: -1px 0px 0px inset var(--st-gray-20);
  }

  :global(button.creation-tab:not(.selected)) {
    box-shadow: 0px -1px 0px inset var(--st-gray-20);
  }

  :global(button.creation-tab.selected) {
    background-color: var(--st-gray-20);
    box-shadow:
      1px 0px 0px inset var(--st-gray-20),
      -1px 0px 0px inset var(--st-gray-20);
  }

  .creation-modal-container {
    height: 100%;
    width: 100%;
  }

  .type-creation-input {
    padding-bottom: 12px;
  }

  .errors {
    height: 100%;
  }
</style>
