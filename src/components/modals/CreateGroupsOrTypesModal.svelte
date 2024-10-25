<svelte:options immutable={true} />

<script lang="ts">
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import { createEventDispatcher } from 'svelte';
  import ImportIcon from '../../assets/import.svg?component';
  import { createExternalEventTypeError, resetExternalEventStores } from '../../stores/external-event';
  import {
    createDerivationGroupError,
    createExternalSourceTypeError,
    externalSourceTypes,
    resetExternalSourceStores,
  } from '../../stores/external-source';
  import type { User } from '../../types/app';
  import type { ExternalEventTypeInsertInput, ExternalEventTypeJSON } from '../../types/external-event';
  import type { DerivationGroupJSON, ExternalSourceTypeInsertInput, ExternalSourceTypeJSON } from '../../types/external-source';
  import type { ParameterName, ParametersMap } from '../../types/parameter';
  import type { ValueSchema } from '../../types/schema';
  import type { TabId } from '../../types/tabs';
  import effects from '../../utilities/effects';
  import { parseJSONStream } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import AlertError from '../ui/AlertError.svelte';
  import ParameterEntry from '../ui/ParameterEntry.svelte';
  import Tab from '../ui/Tabs/Tab.svelte';
  import TabPanel from '../ui/Tabs/TabPanel.svelte';
  import Tabs from '../ui/Tabs/Tabs.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let user: User | null;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();
  const derivationGroupTabId: TabId = 'derivationGroup';
  const externalSourceTypeTabId: TabId = 'externalSourceType';
  const externalEventTypeTabId: TabId = 'externalEventType';
  const createDerivationGroupPermissionError: string = 'You do not have permission to create a derivation group.';
  const createExternalSourceTypePermissionError: string = 'You do not have permission to create an external source type.';
  const createExternalEventTypePermissionError: string = 'You do not have permission to create an external event type.';

  // Derivation group variables
  let hasCreateDerivationGroupPermission: boolean = false;

  let newDerivationGroupName: string | null = null;
  let newDerivationGroupSourceType: string | null = null;

  // External source type variables
  let hasCreateExternalSourceTypePermission: boolean = false;
  let newExternalSourceTypeName: string | null = null;
  let newExternalSourceTypeMetadata: {isRequired: boolean | null, name: ParameterName | null, schema: ValueSchema | null}[] = [];

  // External event type variables
  let hasCreateExternalEventTypePermission: boolean = false;
  let newExternalEventTypeName: string | null = null;
  let newExternalEventTypeMetadata: {isRequired: boolean | null, name: ParameterName | null, schema: ValueSchema | null}[] = [];

  let creationError: string | null = null;
  let hasCreationPermissionForCurrentTab: boolean = false;

  let selectedTab: TabId = derivationGroupTabId; // first tab that appears
  let isCreateDisabled: boolean = true;

  let isUsingImportMode: boolean = false;
  let derivationGroupUploadFiles: FileList | undefined;
  let derivationGroupUploadFileInput: HTMLInputElement;
  let externalSourceTypeUploadFiles: FileList | undefined;
  let externalSourceTypeUploadFileInput: HTMLInputElement;
  let externalEventTypeUploadFiles: FileList | undefined;
  let externalEventTypeUploadFileInput: HTMLInputElement;
  let uploadFilesError: string | null = null;



  // Reactively determine deletion permissions
  $: hasCreateDerivationGroupPermission = featurePermissions.derivationGroup.canCreate(user);
  $: hasCreateExternalSourceTypePermission = featurePermissions.externalSourceType.canCreate(user);
  $: hasCreateExternalEventTypePermission = featurePermissions.externalEventType.canCreate(user);

  $: if (selectedTab === derivationGroupTabId) {
    hasCreationPermissionForCurrentTab = hasCreateDerivationGroupPermission;
    if (isUsingImportMode) {
      isCreateDisabled = derivationGroupUploadFiles === undefined;
    } else {
      isCreateDisabled = (hasCreateDerivationGroupPermission === false) || (newDerivationGroupName === null) || (newDerivationGroupSourceType === null);
    }
  } else if (selectedTab === externalSourceTypeTabId) {
    hasCreationPermissionForCurrentTab = hasCreateExternalSourceTypePermission;
    if (isUsingImportMode) {
      isCreateDisabled = externalSourceTypeUploadFiles === undefined;
    } else {
      isCreateDisabled = (hasCreateExternalSourceTypePermission === false) || (newExternalSourceTypeName === null);
    }
  } else if (selectedTab === externalEventTypeTabId) {
    hasCreationPermissionForCurrentTab = hasCreateExternalEventTypePermission;
    if (isUsingImportMode) {
      isCreateDisabled = externalEventTypeUploadFiles === undefined;
    } else {
      isCreateDisabled = (hasCreateExternalEventTypePermission === false) || (newExternalEventTypeName === null);
    }
  }

  function onCreateDerivationGroup() {
    if (newDerivationGroupName === null) {
      creationError = 'Please enter a new derivation group name.';
    } else if (newDerivationGroupSourceType === null) {
      creationError = 'Please select an external source type.';
    } else {
      effects.createDerivationGroup({ name: newDerivationGroupName, source_type_name: newDerivationGroupSourceType }, user);
      newDerivationGroupName = null;
      newDerivationGroupSourceType = null;
    }
  }

  async function parseDerivationGroupInputFileStream(stream: ReadableStream) {
    uploadFilesError = null;
    try {
      let derivationGroupJSON: DerivationGroupJSON;
      try {
        derivationGroupJSON = await parseJSONStream<DerivationGroupJSON>(stream);
        newDerivationGroupName = derivationGroupJSON.name;
        newDerivationGroupSourceType = derivationGroupJSON.source_type_name;
      } catch (e) {
        throw new Error('Derivation Group Definition File is not a valid JSON');
      }
    } catch (e) {
      uploadFilesError = (e as Error).message;
    }
  }

  async function parseExternalSourceTypeInputFileStream(stream: ReadableStream) {
    uploadFilesError = null;
    try {
      let externalSourceTypeJSON: ExternalSourceTypeJSON;
      try {
        externalSourceTypeJSON = await parseJSONStream<ExternalSourceTypeJSON>(stream);
        newExternalSourceTypeName = externalSourceTypeJSON.name;
        newExternalSourceTypeMetadata = externalSourceTypeJSON.metadata;
      } catch (e) {
        throw new Error('External Source Type Definition File is not a valid JSON');
      }
    } catch (e) {
      uploadFilesError = (e as Error).message;
    }
  }

  async function praseExternalEventTypeInputFileStream(stream: ReadableStream) {
    uploadFilesError = null;
    try {
      let externalEventTypeJSON: ExternalEventTypeJSON;
      try {
        externalEventTypeJSON = await parseJSONStream<ExternalEventTypeJSON>(stream);
        newExternalEventTypeName = externalEventTypeJSON.name;
        newExternalEventTypeMetadata = externalEventTypeJSON.metadata;
      } catch (e) {
        throw new Error('External Event Type Definition File is not a valid JSON');
      }
    } catch (e) {
      uploadFilesError = (e as Error).message;
    }
  }

  function onCreateExternalSourceType() {
    if (newExternalSourceTypeName === null) {
      creationError = 'Please enter a new type name.';
    } else if (newExternalSourceTypeMetadata === undefined) {
      creationError = `Unable to create metadata of '${newExternalSourceTypeName}.'`;
    } else {
      // TODO: This probably doesn't need to exist - swap input keys?
      const newExternalSourceTypeMetadataParameterMap: ParametersMap = {};
      let requiredMetadata: ParameterName[] = [];
      if (newExternalSourceTypeMetadata.length > 0) {
        const isMetadataUnfinished: boolean = newExternalSourceTypeMetadata.map(metadata => metadata.name === null || metadata.schema === null).includes(true);
        if (isMetadataUnfinished) {
          creationError = 'Not all metadata entries appear to be complete - please finish or delete the entries!';
          return;
        }
        newExternalSourceTypeMetadata.forEach(newMetadata => {
          if (newMetadata.name !== null && newMetadata.schema !== null) {
            newExternalSourceTypeMetadataParameterMap[newMetadata.name] = {
              order: 1,
              schema: newMetadata.schema
            }
            if (newMetadata.isRequired) {
              requiredMetadata.push(newMetadata.name);
            }
          }
        });
      }
      // Generate Hasura mutation input
      const externalSourceTypeInsertInput: ExternalSourceTypeInsertInput = {
        metadata: newExternalSourceTypeMetadataParameterMap,
        name: newExternalSourceTypeName,
        required_metadata: requiredMetadata
      };
      effects.createExternalSourceType(externalSourceTypeInsertInput, user);
      newExternalSourceTypeName = null;
      newExternalSourceTypeMetadata = [];
    }
  }

  function onCreateExternalEventType() {
    if (newExternalEventTypeName === null) {
      creationError = 'Please enter a new name.'
    } else if (newExternalEventTypeMetadata === undefined) {
      creationError = `Unable to create the metadata of '${newExternalEventTypeName}.'`;
    } else {
      // TODO: This probably doesn't need to exist - swap input keys?
      const newExternalEventTypeMetadataParameterMap: ParametersMap = {};
      let requiredMetadata: ParameterName[] = [];
      if (newExternalEventTypeMetadata.length > 0) {
        const isMetadataUnfinished: boolean = newExternalEventTypeMetadata.map(metadata => metadata.name === null || metadata.schema === null).includes(true);
        if (isMetadataUnfinished) {
          creationError = 'Not all metadata entries appear to be complete - please finish or delete the entries!';
          return;
        }
        newExternalEventTypeMetadata.forEach(newMetadata => {
          if (newMetadata.name !== null && newMetadata.schema !== null) {
            newExternalEventTypeMetadataParameterMap[newMetadata.name] = {
              order: 1,
              schema: newMetadata.schema
            }
            if (newMetadata.isRequired) {
              requiredMetadata.push(newMetadata.name);
            }
          }
        });
      }
      // Generate Hasura mutation input
      const externalEventTypeInsertInput: ExternalEventTypeInsertInput = {
        metadata: newExternalEventTypeMetadataParameterMap,
        name: newExternalEventTypeName,
        required_metadata: requiredMetadata
      };
      effects.createExternalEventType(externalEventTypeInsertInput, user);
      newExternalEventTypeName = null;
      newExternalEventTypeMetadata = [];
    }
  }

  function handleCreation() {
    if (selectedTab === derivationGroupTabId) {
      onCreateDerivationGroup();
    } else if (selectedTab === externalSourceTypeTabId) {
      onCreateExternalSourceType();
    } else if (selectedTab === externalEventTypeTabId) {
      onCreateExternalEventType();
    }
  }

  function handleChange() {
    resetExternalSourceStores();
    resetExternalEventStores();
    creationError = null;
  }

  function handleTabChange(changeEvent: CustomEvent<{id: TabId, index: number}>) {
    const { id } = changeEvent.detail;
    selectedTab = id;
    handleChange();
  }

  function onImportFileChanged(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files !== null && files.length) {
      const file = files[0];
      if (/\.json$/.test(file.name)) {
        if (selectedTab === derivationGroupTabId) {
          parseDerivationGroupInputFileStream(file.stream());
        } else if (selectedTab === externalSourceTypeTabId) {
          parseExternalSourceTypeInputFileStream(file.stream());
        } else if (selectedTab === externalEventTypeTabId) {
          praseExternalEventTypeInputFileStream(file.stream());
        }
      } else {
        uploadFilesError = 'Plan file is not a .json file';
      }
    }
  }

  function handleAddMetadataToExternalSourceType() {
    newExternalSourceTypeMetadata = [...newExternalSourceTypeMetadata, {isRequired: null, name: null, schema: null}];
  }

  function handleExternalSourceTypeMetadataInput(event: CustomEvent<{id: number, isRequired?: boolean, name?: ParameterName, type?: string}>) {
    const { detail: newValue } = event;
    const metadataOfId = newExternalSourceTypeMetadata.at(newValue.id);
    if (metadataOfId !== undefined) {
      if (newValue?.isRequired) {
        metadataOfId.isRequired = newValue.isRequired;
      } else if (newValue?.name) {
        metadataOfId.name = newValue.name;
      } else if (newValue?.type) {
        metadataOfId.schema = {type: newValue.type} as ValueSchema;
      }
    }
  }

  function handleExternalSourceTypeMetadataDelete(event: CustomEvent<number>) {
    const { detail: metadataId } = event;
    newExternalSourceTypeMetadata = newExternalSourceTypeMetadata.filter((_, index) => index !== metadataId);
  }

  function handleAddMetadataToExternalEventType() {
    newExternalEventTypeMetadata = [...newExternalEventTypeMetadata, {isRequired: null, name: null, schema: null}];
  }

  function handleExternalEventTypeMetadataInput(event: CustomEvent<{id: number, isRequired?: boolean, name?: ParameterName, type?: string}>) {
    const { detail: newValue } = event;
    const metadataOfId = newExternalEventTypeMetadata.at(newValue.id);
    if (metadataOfId !== undefined) {
      if (newValue?.isRequired) {
        metadataOfId.isRequired = newValue.isRequired;
      } else if (newValue?.name) {
        metadataOfId.name = newValue.name;
      } else if (newValue?.type) {
        metadataOfId.schema = {type: newValue.type} as ValueSchema;
      }
    }
  }

  function handleExternalEventTypeMetadataDelete(event: CustomEvent<number>) {
    const { detail: metadataId } = event;
    newExternalEventTypeMetadata = newExternalEventTypeMetadata.filter((_, index) => index !== metadataId);
  }
</script>

<Modal height={400} width={600}>
  <ModalHeader on:close>Create Derivation Groups or Types</ModalHeader>
  <ModalContent style="overflow: auto;">
    <div class="creation-modal-container">
      <div class="creation-modal-tabs-container">
        <Tabs class="creation-tabs" tabListClassName="creation-tabs-list" on:select-tab={handleTabChange}>
          <svelte:fragment slot="tab-list">
            <Tab tabId={derivationGroupTabId} class="creation-tab">Derivation Group</Tab>
            <Tab tabId={externalSourceTypeTabId} class="creation-tab">External Source Type</Tab>
            <Tab tabId={externalEventTypeTabId} class="creation-tab">External Event Type</Tab>
          </svelte:fragment>
          <div>
            <AlertError class="m-2" error={creationError} />
            <AlertError class="m-2" error={$createExternalSourceTypeError} />
            <AlertError class="m-2" error={$createExternalEventTypeError} />
            <AlertError class="m-2" error={$createDerivationGroupError} />
          </div>
          <TabPanel>
            {#if isUsingImportMode}
              <div class="directions">
                <p class="st-typography-body">Select a Derivation Group Definition File (JSON) to import.</p> <!-- TODO: This should link to documentation! -->
                <p class="st-typography-label">
                  The newly created group will be empty, though you can upload sources into it.
                </p>
                <a href={'../'} style:font-style="italic" class="st-typography-label" rel="noopener noreferrer">What is a Derivation Group Definition File?</a>
                <div class="content">
                  <input
                    class="w-100"
                    name="file"
                    type="file"
                    accept="application/json"
                    bind:files={derivationGroupUploadFiles}
                    bind:this={derivationGroupUploadFileInput}
                    use:permissionHandler={{
                      hasPermission: hasCreateDerivationGroupPermission,
                      permissionError: createDerivationGroupPermissionError,
                    }}
                    on:change={onImportFileChanged}
                  />
                </div>
              </div>
              {#if uploadFilesError}
                <div class="error">{uploadFilesError}</div>
              {/if}
            {:else}
              <div class="directions">
                <p class="st-typography-body">Provide a name and an external source type for the new derivation group.</p>
                <p class="st-typography-label">
                  The newly created group will be empty, though you can upload sources into it.
                </p>
              </div>
            {/if}
            <div class="content">
              <input
                bind:value={newDerivationGroupName}
                on:change={handleChange}
                disabled={isUsingImportMode}
                autocomplete="off"
                class="st-input w-50"
                placeholder="New Derivation Group Name"
              />
              <select
                bind:value={newDerivationGroupSourceType}
                on:change={handleChange}
                disabled={isUsingImportMode}
                class="st-select w-50"
              >
                {#each $externalSourceTypes as sourceType}
                  <option value={sourceType.name}>{sourceType.name}</option>
                {/each}
              </select>
            </div>
          </TabPanel>
          <TabPanel>
            {#if isUsingImportMode}
              <div class="directions">
                <p class="st-typography-body">Select an External Source Type Definition File (JSON) to import.</p> <!-- TODO: This should link to documentation! -->
                <p class="st-typography-label">
                  The newly created external source type will be empty, though you can upload sources using it.
                </p>
                <a href={'../'} style:font-style="italic" class="st-typography-label" rel="noopener noreferrer">What is an External Source Type Definition File?</a>
                <div class="content">
                  <input
                    class="w-100"
                    name="file"
                    type="file"
                    accept="application/json"
                    bind:files={externalSourceTypeUploadFiles}
                    bind:this={externalSourceTypeUploadFileInput}
                    use:permissionHandler={{
                      hasPermission: hasCreateExternalSourceTypePermission,
                      permissionError: createExternalSourceTypePermissionError,
                    }}
                    on:change={onImportFileChanged}
                  />
                </div>
              </div>
              {#if uploadFilesError}
                <div class="error">{uploadFilesError}</div>
              {/if}
            {:else}
              <div class="directions">
                <p class="st-typography-body">Provide a name for the new external source type.</p>
                <p class="st-typography-label">
                  The newly created external source type will be empty, though you can upload sources into it.
                </p>
              </div>
            {/if}
            <div class="content parameters">
              <input
                bind:value={newExternalSourceTypeName}
                on:change={handleChange}
                disabled={isUsingImportMode}
                autocomplete="off"
                class="st-input w-100"
                placeholder="New External Source Type Name"
              />
              {#each newExternalSourceTypeMetadata as metadata, metadataIndex}
                <ParameterEntry
                  disabled={isUsingImportMode}
                  id={metadataIndex}
                  value={metadata}
                  newParameterNamePlaceholder="New External Source Type Metadata Name"
                  on:input={handleExternalSourceTypeMetadataInput}
                  on:delete={handleExternalSourceTypeMetadataDelete}
                />
              {/each}
              <button
                disabled={isUsingImportMode}
                style:display="grid"
                class="st-button icon add-metadata-button"
                on:click={handleAddMetadataToExternalSourceType}
              >
                <PlusIcon/>
              </button>
            </div>
          </TabPanel>
          <TabPanel>
            {#if isUsingImportMode}
              <div class="directions">
                <p class="st-typography-body">Select an External Event Type Definition File (JSON) to import.</p> <!-- TODO: This should link to documentation! -->
                <p class="st-typography-label">
                  The newly created external event type will be empty, though you can upload events using it.
                </p>
                <a href={'../'} style:font-style="italic" class="st-typography-label" rel="noopener noreferrer">What is an External Event Type Definition File?</a>
                <div class="content">
                  <input
                    class="w-100"
                    name="file"
                    type="file"
                    accept="application/json"
                    bind:files={externalEventTypeUploadFiles}
                    bind:this={externalEventTypeUploadFileInput}
                    use:permissionHandler={{
                      hasPermission: hasCreateExternalEventTypePermission,
                      permissionError: createExternalEventTypePermissionError,
                    }}
                    on:change={onImportFileChanged}
                  />
                </div>
              </div>
            {:else}
              <div class="directions">
                <p class="st-typography-body">Provide a name for the new external event type.</p>
                <p class="st-typography-label">
                  The newly created external event type will be empty, though you can upload events into it.
                </p>
              </div>
            {/if}
            <div class="content parameters">
              <input
                bind:value={newExternalEventTypeName}
                on:change={handleChange}
                autocomplete="off"
                class="st-input w-100"
                disabled={isUsingImportMode}
                placeholder="New External Event Type Name"
              />
              {#each newExternalEventTypeMetadata as metadata, metadataIndex}
                <ParameterEntry
                  disabled={isUsingImportMode}
                  id={metadataIndex}
                  value={metadata}
                  newParameterNamePlaceholder="New External Event Type Metadata Name"
                  on:input={handleExternalEventTypeMetadataInput}
                  on:delete={handleExternalEventTypeMetadataDelete}
                />
              {/each}
              <button
                style:display="grid"
                class="st-button icon add-metadata-button"
                disabled={isUsingImportMode}
                on:click={handleAddMetadataToExternalEventType}
              >
                <PlusIcon/>
              </button>
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
    <button
      class="st-button secondary"
      type="button"
      on:click={() => isUsingImportMode = !isUsingImportMode}
    >
      <ImportIcon /> Import
    </button>
    <button
      class="st-button primary"
      type="submit"
      disabled={isCreateDisabled}
      on:click|preventDefault={handleCreation}
      use:permissionHandler={{
        hasPermission: hasCreationPermissionForCurrentTab
      }}
    >
      Create
    </button>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Close </button>
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

  .add-metadata-button {
    background: var(--st-gray-20);
  }

  .creation-modal-container {
    height: 100%;
    width: 100%;
  }

  .creation-modal-tabs-container {
    display: flex;
    flex: 1;
    flex-direction: column;
    height: 100%;
    justify-content: flex-end;
  }

  .directions {
    padding-bottom: 12px;
    padding-top: 12px;
  }

  .parameters {
    flex-direction: column;
    height: 100%;
    justify-content: flex-start;
  }

  .content {
    display: flex;
    gap: 8px;
    padding-bottom: 12px;
    padding-top: 12px;
  }
</style>
