<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { createExternalEventTypeError, resetExternalEventStores } from '../../stores/external-event';
  import {
    createDerivationGroupError,
    createExternalSourceTypeError,
    externalSourceTypes,
    resetExternalSourceStores,
  } from '../../stores/external-source';
  import type { User } from '../../types/app';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import AlertError from '../ui/AlertError.svelte';
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

  let newTypeName: string = '';
  let newTypeSourceType: string = '';
  let newTypeError: string | null = null;

  let hasCreateDerivationGroupPermission: boolean = false;
  let hasCreateExternalSourceTypePermission: boolean = false;
  let hasCreateExternalEventTypePermission: boolean = false;

  $: hasCreateDerivationGroupPermission = featurePermissions.derivationGroup.canCreate(user);

  $: hasCreateExternalSourceTypePermission = featurePermissions.externalSourceType.canCreate(user);

  $: hasCreateExternalEventTypePermission = featurePermissions.externalEventType.canCreate(user);

  function onCreateDerivationGroup() {
    if (newTypeName === '') {
      newTypeError = 'Please select a source type.';
    } else if (newTypeSourceType === '') {
      newTypeError = 'Please enter a new type name.';
    } else {
      effects.createDerivationGroup({ name: newTypeName, source_type_name: newTypeSourceType }, user);
      newTypeName = '';
      newTypeSourceType = '';
    }
  }

  function onCreateExternalSourceType() {
    if (newTypeName === '') {
      newTypeError = 'Please enter a new type name.';
    } else {
      effects.createExternalSourceType({ name: newTypeName }, user);
      newTypeName = '';
    }
  }

  function onCreateExternalEventType() {
    if (newTypeName === '') {
      newTypeError = 'Please enter a new type name.';
    } else {
      effects.createExternalEventType({ name: newTypeName }, user);
      newTypeName = '';
    }
  }
  function handleChange() {
    resetExternalSourceStores();
    resetExternalEventStores();
    newTypeError = null;
  }
</script>

<Modal height={240} width={600}>
  <ModalHeader on:close>Create Derivation Groups or Types</ModalHeader>
  <ModalContent>
    <div class="creation-modal-container">
      <div class="creation-modal-tabs-container">
        <Tabs class="creation-tabs" tabListClassName="creation-tabs-list" on:select-tab={handleChange}>
          <svelte:fragment slot="tab-list">
            <Tab class="creation-tab">Derivation Group</Tab>
            <Tab class="creation-tab">External Source Type</Tab>
            <Tab class="creation-tab">External Event Type</Tab>
          </svelte:fragment>
          <TabPanel>
            <div class="creation-tab-directions">
              <p class="st-typography-body">Provide a name and an external source type for the new derivation group.</p>
              <p class="st-typography-label">
                The newly created group will be empty, though you can upload sources into it.
              </p>
            </div>
            <div class="creation-tab-inputs">
              <input
                bind:value={newTypeName}
                on:change={handleChange}
                autocomplete="off"
                class="st-input w-full"
                placeholder="New Derivation Group Name"
              />
              <select bind:value={newTypeSourceType} on:change={handleChange} class="st-select source-type-selection">
                {#each $externalSourceTypes as sourceType}
                  <option value={sourceType.name}>{sourceType.name}</option>
                {/each}
              </select>
              <button
                class="st-button"
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
            <div class="creation-tab-directions">
              <p class="st-typography-body">Provide a name for the new external source type.</p>
              <p class="st-typography-label">
                The newly created external source type will be empty, though you can upload sources into it.
              </p>
            </div>
            <div class="creation-tab-inputs">
              <input
                bind:value={newTypeName}
                on:change={handleChange}
                autocomplete="off"
                class="st-input w-full"
                placeholder="New External Source Type Name"
              />
              <button
                class="st-button"
                type="submit"
                on:click|preventDefault={onCreateExternalSourceType}
                use:permissionHandler={{
                  hasPermission: hasCreateExternalSourceTypePermission,
                  permissionError: 'You do not have permission to create an external source type.',
                }}
              >
                Create
              </button>
            </div>
          </TabPanel>
          <TabPanel>
            <div class="creation-tab-directions">
              <p class="st-typography-body">Provide a name for the new external event type.</p>
              <p class="st-typography-label">
                The newly created external event type will be empty, though you can upload events into it.
              </p>
            </div>
            <div class="creation-tab-inputs">
              <input
                bind:value={newTypeName}
                on:change={handleChange}
                autocomplete="off"
                class="st-input w-full"
                placeholder="New External Event Type Name"
              />
              <button
                class="st-button"
                type="submit"
                on:click|preventDefault={onCreateExternalEventType}
                use:permissionHandler={{
                  hasPermission: hasCreateExternalEventTypePermission,
                  permissionError: 'You do not have permission to create an external event type.',
                }}
              >
                Create
              </button>
            </div>
          </TabPanel>
        </Tabs>
      </div>
      <div>
        <AlertError class="m-2" error={newTypeError} />
        <AlertError class="m-2" error={$createExternalSourceTypeError} />
        <AlertError class="m-2" error={$createExternalEventTypeError} />
        <AlertError class="m-2" error={$createDerivationGroupError} />
      </div>
    </div>
  </ModalContent>
  <ModalFooter>
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

  .creation-modal-container {
    width: 100%;
  }

  .creation-modal-tabs-container {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: flex-end;
  }

  .creation-tab-directions {
    padding-top: 12px;
  }

  .creation-tab-inputs {
    display: flex;
    flex-direction: row;
    gap: 8px;
    padding-top: 8px;
  }

  .source-type-selection {
    width: 200px;
  }
</style>
