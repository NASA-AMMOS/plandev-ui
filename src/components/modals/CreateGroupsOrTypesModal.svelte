<svelte:options immutable={true} />

<script lang="ts">
  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { createExternalSourceEventTypeError } from '../../stores/external-source';
  import type { User } from '../../types/app';
  import effects from '../../utilities/effects';
  import { parseJSONStream } from '../../utilities/generic';
  import { featurePermissions } from '../../utilities/permissions';
  import AlertError from '../ui/AlertError.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  let fileInput: HTMLInputElement;
  let uploadResponseErrors: string[] = [];
  let files: FileList | undefined;
  let file: File | undefined;
  let parsedExternalSourceEventTypeSchema: object | undefined = undefined; // TODO: Define explicit type

  let hasCreateExternalSourceTypePermission: boolean = false;
  let hasCreateExternalEventTypePermission: boolean = false;
  let hasCreationPermission: boolean = false;

  $: hasCreateExternalSourceTypePermission = featurePermissions.externalSourceType.canCreate(user);
  $: hasCreateExternalEventTypePermission = featurePermissions.externalEventType.canCreate(user);
  $: hasCreationPermission = hasCreateExternalEventTypePermission && hasCreateExternalSourceTypePermission;

  $: if (files) {
    if (file !== files[0]) {
      file = files[0];
      if (file !== undefined && /\.json$/.test(file.name)) {
        parseExternalSourceEventTypeFileStream(file.stream());
      } else {
        createExternalSourceEventTypeError.set('External Source & Event Type(s) schema is not a .json file');
      }
    }
  }

  function onClick() {
    fileInput.value = '';
    uploadResponseErrors = [];
  }

  async function handleUpload() {
    if (files) {
      file = files[0];
      if (file !== undefined && /\.json$/.test(file.name)) {
        uploadResponseErrors = [];
        const combinedSchema = await parseJSONStream<{event_types: object, source_types: object}>(file.stream());
        const creationResponse = await effects.createExternalSourceEventTypes(combinedSchema.event_types, combinedSchema.source_types, user);
        if (creationResponse !== null) {
          dispatch('close');
        }
        files = undefined;
        file = undefined;
        fileInput.value = '';
      }
    }
  }

  async function parseExternalSourceEventTypeFileStream(stream: ReadableStream) {
    createExternalSourceEventTypeError.set(null);

    try {
      parsedExternalSourceEventTypeSchema = await parseJSONStream<object>(stream);  // TODO: Define type
    } catch (error) {
      createExternalSourceEventTypeError.set('External Source & Event Type Schema has Invalid Format');
    }
  }
</script>

<Modal height={400} width={600}>
  <ModalHeader on:close>Create New External Source/Event Types</ModalHeader>
  <ModalContent style="overflow: auto;">
    <div class="creation-modal-container">
      <div class="type-creation-input">
        <label for="file">Type JSON Schema File</label>
        <input
          bind:this={fileInput}
          class="w-100 upload"
          class:error={!!uploadResponseErrors.length}
          name="file"
          required
          type="file"
          accept="application/json"
          bind:files
          on:click={onClick}
        />
      </div>
      {#if file !== undefined}
        {#if parsedExternalSourceEventTypeSchema !== undefined}
          <div class="parse-status st-typography-body">
            <div class="check">
              <CheckIcon />
            </div>
            Source & Event Type Attribute Schema Parsed
          </div>
        {:else}
          <WarningIcon />
          <div class="status-text st-typography-body">
            Source & Event Type Attribute Schema Could Not Be Parsed
          </div>
        {/if}
      {/if}
      {#if parsedExternalSourceEventTypeSchema !== undefined}
        <div class="to-be-created st-typography-body">
          <div class="to-be-created-header">
            The following External Source Type will be created
          </div>
          <div class="to-be-created-header">
            The following External Event Type(s) will be created
          </div>
        </div>
      {/if}
      <div class="errors">
        {#each uploadResponseErrors as currentError}
          <AlertError class="m-2" error={currentError} />
        {/each}
        <AlertError class="m-2" error={$createExternalSourceEventTypeError} />
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

  .to-be-created-header {
    font-weight: bold;
  }

  .parse-status {
    display: flex;
    margin-bottom: 12px;
    margin-top: 12px;
  }

  .parse-status .check {
    background-color: #0eaf0a;
    border-radius: 50%;
    color: var(--st-white);
    display: flex;
    margin-right: 6px;
  }
</style>
