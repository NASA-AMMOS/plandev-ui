<svelte:options immutable={true} />

<script lang="ts">
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import { createEventDispatcher } from 'svelte';
  import ImportIcon from '../../assets/import.svg?component';
  import { createExternalEventTypeError, externalEventTypes, resetExternalEventStores } from '../../stores/external-event';
  import {
    createDerivationGroupError,
    createExternalSourceTypeError,
    externalSourceTypes,
    resetExternalSourceStores,
  } from '../../stores/external-source';
  import type { User } from '../../types/app';
  import type { ExternalEventType, ExternalEventTypeInsertInput } from '../../types/external-event';
  import type { DerivationGroupJSON, ExternalSourceTypeInsertInput } from '../../types/external-source';
  import type { ParameterName, ParametersMap } from '../../types/parameter';
  import type { ValueSchema } from '../../types/schema';
  import type { TabId } from '../../types/tabs';
  import effects from '../../utilities/effects';
  import { getTarget, parseJSONStream } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import Collapse from '../Collapse.svelte';
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

  // Derivation group variables
  let hasCreateDerivationGroupPermission: boolean = false;

  let newDerivationGroupName: string | null = null;
  let newDerivationGroupSourceType: string | null = null;

  // External source type variables
  let hasCreateExternalSourceTypePermission: boolean = false;
  let newExternalSourceTypeMetadataCount: number = 1;
  let newExternalSourceTypeName: string | null = null;
  let newExternalSourceTypeMetadata: ParameterEntry[] = [];
  let newExternalSourceTypeAllowedEventTypes: Record<string, boolean> = {};

  // External event type variables
  let hasCreateExternalEventTypePermission: boolean = false;
  let newExternalEventTypeMetadataCount: number = 1;
  let newExternalEventTypeName: string | null = null;
  let newExternalEventTypeMetadata: ParameterEntry[] = [];

  let creationError: string | null = null;
  let hasCreationPermissionForCurrentTab: boolean = false;

  let selectedTab: TabId = derivationGroupTabId; // first tab that appears
  let isCreateDisabled: boolean = true;

  let availableExternalEventTypes: ExternalEventType[] = [];

  let isUsingImportMode: boolean = false;
  let derivationGroupUploadFiles: FileList | undefined;
  let derivationGroupUploadFileInput: HTMLInputElement;
  let uploadFilesError: string | null = null;

  $: availableExternalEventTypes = $externalEventTypes;

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
      console.log("TODO");
    } else {
      isCreateDisabled = (hasCreateExternalSourceTypePermission === false) || (newExternalSourceTypeName === null);
    }
  } else if (selectedTab === externalEventTypeTabId) {
    hasCreationPermissionForCurrentTab = hasCreateExternalEventTypePermission;
    if (isUsingImportMode) {
      console.log("TODO");
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
        throw new Error('Derivation Group Schema File is not a valid JSON');
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
      // Create the ParameterMap for all of the type's metadata
      const newExternalSourceTypeMetadataObjects = newExternalSourceTypeMetadata.map(newMetadata => newMetadata.getParameterEntry());
      const newExternalSourceTypeMetadataParameterMap: ParametersMap = {};
      if (newExternalSourceTypeMetadataObjects.length > 0) {
        newExternalSourceTypeMetadataObjects.forEach((newMetadata, index) => {
          newExternalSourceTypeMetadataParameterMap[newMetadata.name] = {
            order: index,
            schema: newMetadata.type
          }
        });
      }
      // Create list of all required metadata for the type
      const requiredMetadata: ParameterName[] = newExternalSourceTypeMetadataObjects.filter(metadata => metadata.isRequired === true).map(metadata => metadata.name);
      // Generate Hasura mutation input
      const externalSourceTypeInsertInput: ExternalSourceTypeInsertInput = {
        metadata: newExternalSourceTypeMetadataParameterMap,
        name: newExternalSourceTypeName,
        required_metadata: requiredMetadata,
      };
      effects.createExternalSourceType(externalSourceTypeInsertInput, user);
      newExternalSourceTypeName = null;
      newExternalSourceTypeMetadata = [];
      newExternalSourceTypeMetadataCount = 1;
    }
  }

  function onCreateExternalEventType() {
    if (newExternalEventTypeName === null) {
      creationError = 'Please enter a new name.'
    } else if (newExternalEventTypeMetadata === undefined) {
      creationError = `Unable to create the metadata of '${newExternalEventTypeName}.'`;
    } else {
      let newExternalEventTypeMetadataObjects: { isRequired: boolean, name: string, type: ValueSchema }[] = [];
      let newExternalEventTypeMetadataParameterMap: ParametersMap = {};
      // Create the ParameterMap for all of the type's metadata
      if (Object.entries(newExternalEventTypeMetadata.length > 0)) {
        newExternalEventTypeMetadataObjects = newExternalEventTypeMetadata.map(newMetadata => newMetadata.getParameterEntry());
        newExternalEventTypeMetadataObjects.forEach((newMetadata, index) => {
          newExternalEventTypeMetadataParameterMap[newMetadata.name] = {
            order: index,
            schema: newMetadata.type
          }
        });
      }
      // Create list of all required metadata for the type
      const requiredMetadata: ParameterName[] = newExternalEventTypeMetadataObjects.filter(metadata => metadata.isRequired === true).map(metadata => metadata.name);
      // Generate Hasura mutation input
      const externalEventTypeInsertInput: ExternalEventTypeInsertInput = {
        metadata: newExternalEventTypeMetadataParameterMap,
        name: newExternalEventTypeName,
        required_metadata: requiredMetadata,
      };
      effects.createExternalEventType(externalEventTypeInsertInput, user);
      newExternalEventTypeName = null;
      newExternalEventTypeMetadata = [];
      newExternalEventTypeMetadataCount = 1;
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
    newExternalSourceTypeAllowedEventTypes = {};
  }

  function handleTabChange(changeEvent: CustomEvent<{id: TabId, index: number}>) {
    const { id } = changeEvent.detail;
    selectedTab = id;
    handleChange();
  }

  function onAllowedExternalEventTypeCheckboxChanged(event: Event) {
    const { name: externalEventTypeName, value: checked } = getTarget(event);
    if (checked === true) {
      newExternalSourceTypeAllowedEventTypes[externalEventTypeName] = checked;
    } else {
      delete newExternalSourceTypeAllowedEventTypes[externalEventTypeName];
    }
  }

  function onImportFileChanged(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files !== null && files.length) {
      const file = files[0];
      if (/\.json$/.test(file.name)) {
        if (selectedTab === derivationGroupTabId) {
          parseDerivationGroupInputFileStream(file.stream());
        } else if (selectedTab === externalSourceTypeTabId) {
          parseExternalSourceTypeInputFileStream();
        } else if (selectedTab === externalEventTypeTabId) {
          praseExternalEventTypeInputFileStream();
        }
        //parseInputFileStream(file.stream());
      } else {
        uploadFilesError = 'Plan file is not a .json file';
      }
    }
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
          <TabPanel>
            {#if isUsingImportMode}
              <div class="directions">
                <p class="st-typography-body">Select a Derivation Group Schema File (JSON) to import.</p> <!-- TODO: This should link to documentation! -->
                <p class="st-typography-label">
                  The newly created group will be empty, though you can upload sources into it.
                </p>
                <a href={'../'} style:font-style="italic" class="st-typography-label" rel="noopener noreferrer">What is a Derivation Group Schema File?</a>
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
            {/if}
            <div class="directions">
              <p class="st-typography-body">Provide a name and an external source type for the new derivation group.</p>
              <p class="st-typography-label">
                The newly created group will be empty, though you can upload sources into it.
              </p>
            </div>
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
            <div class="directions">
              <p class="st-typography-body">Provide a name for the new external source type.</p>
              <p class="st-typography-label">
                The newly created external source type will be empty, though you can upload sources into it.
              </p>
            </div>
            <div class="content parameters">
              <input
                bind:value={newExternalSourceTypeName}
                on:change={handleChange}
                autocomplete="off"
                class="st-input w-100"
                placeholder="New External Source Type Name"
              />
              <Collapse
                title="Configure Allowed External Event Types"
                tooltipContent="Select external event types that can be used by events in external sources using this external source type"
                defaultExpanded={false}
              >
                {#if availableExternalEventTypes.length > 0}
                  {#each $externalEventTypes as externalEventType}
                    <div style:display="flex">
                      <label
                        class="st-typography-body"
                        for={externalEventType.name}
                        >
                        {externalEventType.name}
                      </label>
                      <input
                        type="checkbox"
                        name={externalEventType.name}
                        on:change={onAllowedExternalEventTypeCheckboxChanged}
                      />
                    </div>
                  {/each}
                {:else}
                  <div class="st-typography-body">
                    No external event types available
                  </div>
                {/if}
              </Collapse>
              <Collapse
                title="Configure External Source Type Metadata"
                tooltipContent="Create a metadata schema for the new external source type"
                defaultExpanded={false}
              >
                {#each Array(newExternalSourceTypeMetadataCount) as _, externalSourceTypeMetadataIndex}
                  <ParameterEntry
                    bind:this={newExternalSourceTypeMetadata[externalSourceTypeMetadataIndex]}
                    newParameterNamePlaceholder="New External Source Type Metadata Name"
                  />
                {/each}
                <button
                  class="st-button icon add-metadata-button"
                  on:click={() => {newExternalSourceTypeMetadataCount++;}}
                >
                  <PlusIcon/>
                </button>
              </Collapse>
            </div>
          </TabPanel>
          <TabPanel>
            <div class="directions">
              <p class="st-typography-body">Provide a name for the new external event type.</p>
              <p class="st-typography-label">
                The newly created external event type will be empty, though you can upload events into it.
              </p>
            </div>
            <div class="content parameters">
              <input
                bind:value={newExternalEventTypeName}
                on:change={handleChange}
                autocomplete="off"
                class="st-input w-100"
                placeholder="New External Event Type Name"
              />
              {#each Array(newExternalEventTypeMetadataCount) as _, externalEventTypeMetadataIndex}
                <ParameterEntry
                  bind:this={newExternalEventTypeMetadata[externalEventTypeMetadataIndex]}
                  newParameterNamePlaceholder="New External Event Type Metadata Name"
                />
              {/each}
              <button
                class="st-button icon add-metadata-button"
                on:click={() => {newExternalEventTypeMetadataCount++;}}
              >
                <PlusIcon/>
              </button>
            </div>
          </TabPanel>
        </Tabs>
      </div>
      <div>
        <AlertError class="m-2" error={creationError} />
        <AlertError class="m-2" error={$createExternalSourceTypeError} />
        <AlertError class="m-2" error={$createExternalEventTypeError} />
        <AlertError class="m-2" error={$createDerivationGroupError} />
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
