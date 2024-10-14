<svelte:options immutable={true} />

<script lang="ts">
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { createExternalEventTypeError, resetExternalEventStores } from '../../stores/external-event';
  import {
    createDerivationGroupError,
    createExternalSourceTypeError,
    externalSourceTypes,
    resetExternalSourceStores,
  } from '../../stores/external-source';
  import type { User } from '../../types/app';
  import type { ExternalEventTypeInsertInput } from '../../types/external-event';
  import type { ExternalSourceTypeInsertInput } from '../../types/external-source';
  import type { ParameterName, ParametersMap } from '../../types/parameter';
  import type { TabId } from '../../types/tabs';
  import effects from '../../utilities/effects';
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

  // Derivation group variables
  let hasCreateDerivationGroupPermission: boolean = false;
  let newDerivationGroupName: string | null = null;
  let newDerivationGroupSourceType: string | null = null;

  // External source type variables
  let hasCreateExternalSourceTypePermission: boolean = false;
  let newExternalSourceTypeMetadataCount: number = 1;
  let newExternalSourceTypeName: string | null = null;
  let newExternalSourceTypeMetadata: ParameterEntry[] = [];

  // External event type variables
  let hasCreateExternalEventTypePermission: boolean = false;
  let newExternalEventTypePropertiesCount: number = 1;
  let newExternalEventTypeName: string | null = null;
  let newExternalEventTypeProperties: ParameterEntry[] = [];

  let creationError: string | null = null;
  let hasCreationPermissionForCurrentTab: boolean = false;

  let selectedTab: TabId = derivationGroupTabId; // first tab that appears
  let isCreateDisabled: boolean = true;

  // Reactively determine deletion permissions
  $: hasCreateDerivationGroupPermission = featurePermissions.derivationGroup.canCreate(user);
  $: hasCreateExternalSourceTypePermission = featurePermissions.externalSourceType.canCreate(user);
  $: hasCreateExternalEventTypePermission = featurePermissions.externalEventType.canCreate(user);

  $: if (selectedTab === derivationGroupTabId) {
    hasCreationPermissionForCurrentTab = hasCreateDerivationGroupPermission;
    isCreateDisabled = (hasCreateDerivationGroupPermission === false) || (newDerivationGroupName === null) || (newDerivationGroupSourceType === null);
  } else if (selectedTab === externalSourceTypeTabId) {
    hasCreationPermissionForCurrentTab = hasCreateExternalSourceTypePermission;
    isCreateDisabled = (hasCreateExternalSourceTypePermission === false) || (newExternalSourceTypeName === null);
  } else if (selectedTab === externalEventTypeTabId) {
    hasCreationPermissionForCurrentTab = hasCreateExternalEventTypePermission;
    isCreateDisabled = (hasCreateExternalEventTypePermission === false) || (newExternalEventTypeName === null);
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

  function onCreateExternalSourceType() {
    if (newExternalSourceTypeName === null) {
      creationError = 'Please enter a new type name.';
    } else if (newExternalSourceTypeMetadata === undefined) {
      creationError = `Unable to create metadata of '${newExternalSourceTypeName}.'`;
    } else {
      // Create the ParameterMap for all of the type's metadata
      const newExternalSourceTypeMetadataObjects = newExternalSourceTypeMetadata.map(newMetadata => newMetadata.getParameterEntry());
      const newExternalSourceTypeMetadataParameterMap: ParametersMap = {};
      newExternalSourceTypeMetadataObjects.forEach((newMetadata, index) => {
        newExternalSourceTypeMetadataParameterMap[newMetadata.name] = {
          order: index,
          schema: newMetadata.type
        }
      });
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
    } else if (newExternalEventTypeProperties === undefined) {
      creationError = `Unable to create the properties of '${newExternalEventTypeName}.'`;
    } else {
      // Create the ParameterMap for all of the type's properties
      const newExternalEventTypePropertyObjects = newExternalEventTypeProperties.map(newProperty => newProperty.getParameterEntry());
      const newExternalEventTypePropertyParameterMap: ParametersMap = {};
      newExternalEventTypePropertyObjects.forEach((newProperty, index) => {
        newExternalEventTypePropertyParameterMap[newProperty.name] = {
          order: index,
          schema: newProperty.type
        }
      });
      // Create list of all required properties for the type
      const requiredProperties: ParameterName[] = newExternalEventTypePropertyObjects.filter(property => property.isRequired === true).map(property => property.name);
      // Generate Hasura mutation input
      const externalEventTypeInsertInput: ExternalEventTypeInsertInput = {
        name: newExternalEventTypeName,
        properties: newExternalEventTypePropertyParameterMap,
        required_properties: requiredProperties,
      };
      effects.createExternalEventType(externalEventTypeInsertInput, user);
      newExternalEventTypeName = null;
      newExternalEventTypeProperties = [];
      newExternalEventTypePropertiesCount = 1;
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
                autocomplete="off"
                class="st-input w-50"
                placeholder="New Derivation Group Name"
              />
              <select
                bind:value={newDerivationGroupSourceType}
                on:change={handleChange}
                class="st-select w-50"
              >
                {#each $externalSourceTypes as sourceType}
                  <option value={sourceType.name}>{sourceType.name}</option>
                {/each}
              </select>
              <button
                class="st-button w-10"
                type="submit"
                on:click|preventDefault={onCreateDerivationGroup}
                use:permissionHandler={{
                  hasPermission: hasCreateDerivationGroupPermission,
                  permissionError: 'You do not have permission to create a derivation group.',
                }}
              >
                Create
              </button>
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
              {#each Array(newExternalSourceTypeMetadataCount) as _, externalSourceTypeMetadataIndex}
                <ParameterEntry
                  bind:this={newExternalSourceTypeMetadata[externalSourceTypeMetadataIndex]}
                  newParameterNamePlaceholder="New External Source Type Metadata Name"
                />
              {/each}
              <button
                class="st-button icon add-property-button"
                on:click={() => {newExternalSourceTypeMetadataCount++;}}
              >
                <PlusIcon/>
              </button>
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
              {#each Array(newExternalEventTypePropertiesCount) as _, externalEventTypePropertyIndex}
                <ParameterEntry
                  bind:this={newExternalEventTypeProperties[externalEventTypePropertyIndex]}
                  newParameterNamePlaceholder="New External Event Type Property Name"
                />
              {/each}
              <button
                class="st-button w-10"
                type="submit"
                on:click|preventDefault={onCreateExternalEventType}
                use:permissionHandler={{
                  hasPermission: hasCreateExternalEventTypePermission,
                  permissionError: 'You do not have permission to create an external event type.',
                }}
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

  .add-property-button {
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
