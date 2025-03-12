<svelte:options immutable={true} />

<script lang="ts">
  import HourglassIcon from 'bootstrap-icons/icons/hourglass-top.svg?component';
  import Nav from '../../components/app/Nav.svelte';
  import PageTitle from '../../components/app/PageTitle.svelte';
  import DictionaryTable from '../../components/parcels/DictionaryTable.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
  import Panel from '../../components/ui/Panel.svelte';
  import SectionTitle from '../../components/ui/SectionTitle.svelte';
  import { sequenceAdaptations } from '../../stores/sequence-adaptation';
  import { channelDictionaries, commandDictionaries, parameterDictionaries } from '../../stores/sequencing';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import type { PageData } from './$types';

  export let data: PageData;

  const createPermissionError = 'You do not have permission to create Command Dictionaries';

  let createButtonDisabled: boolean = false;
  let createDictionaryError: string | null = null;
  let creatingDictionary: boolean = false;
  let files: FileList | undefined;
  let file: File;
  let fileInput: HTMLInputElement;
  let isSequenceAdaptation: boolean = false;
  let sequenceAdaptationName: string;

  $: hasCreatePermission =
    featurePermissions.channelDictionary.canCreate(data.user) &&
    featurePermissions.commandDictionary.canCreate(data.user) &&
    featurePermissions.parameterDictionary.canCreate(data.user) &&
    featurePermissions.sequenceAdaptation.canCreate(data.user);
  $: createButtonDisabled = !files || files?.length === 0 || (isSequenceAdaptation && sequenceAdaptationName === '');
  $: {
    if (files && files.length > 0) {
      file = files[0];

      isSequenceAdaptation = file.name.substring(file.name.lastIndexOf('.')) === '.js';
      sequenceAdaptationName = '';
    }
  }

  async function uploadDictionaryOrAdaptation() {
    createDictionaryError = null;
    creatingDictionary = true;

    try {
      await effects.uploadDictionaryOrAdaptation(file, data.user, sequenceAdaptationName);

      // Set files to undefined to reset the input form and set the value to empty string to clear the uploaded file.
      files = undefined;
      fileInput.value = '';
      isSequenceAdaptation = false;
      sequenceAdaptationName = '';
    } catch (e) {
      createDictionaryError = (e as Error).message;
    }

    creatingDictionary = false;
  }

  function deleteChannelDictionary(event: CustomEvent) {
    effects.deleteChannelDictionary(event.detail.id, data.user);
  }

  function deleteCommandDictionary(event: CustomEvent) {
    effects.deleteCommandDictionary(event.detail.id, data.user);
  }

  function deleteParameterDictionary(event: CustomEvent) {
    effects.deleteParameterDictionary(event.detail.id, data.user);
  }

  function deleteSequenceAdaptation(event: CustomEvent) {
    effects.deleteSequenceAdaptation(event.detail.id, data.user);
  }
</script>

<PageTitle title="Dictionaries" />

<CssGrid rows="var(--nav-header-height) calc(100vh - var(--nav-header-height))">
  <Nav user={data.user}>
    <span slot="title">Dictionaries</span>
  </Nav>

  <CssGrid columns="20% auto">
    <Panel borderRight padBody={false}>
      <svelte:fragment slot="header">
        <SectionTitle>New Dictionary</SectionTitle>
      </svelte:fragment>

      <svelte:fragment slot="body">
        <form on:submit|preventDefault={uploadDictionaryOrAdaptation}>
          <AlertError class="m-2" error={createDictionaryError} />

          <fieldset>
            <label for="file">AMPCS XML File or Sequence Adaptation</label>
            <input
              accept=".xml,.js,.json"
              class="st-typography-body w-full"
              name="file"
              required
              type="file"
              bind:files
              bind:this={fileInput}
              use:permissionHandler={{
                hasPermission: hasCreatePermission,
                permissionError: createPermissionError,
              }}
            />
          </fieldset>

          {#if isSequenceAdaptation}
            <fieldset>
              <input
                bind:value={sequenceAdaptationName}
                autocomplete="off"
                class="st-input w-full"
                name="sequenceAdaptationName"
                placeholder="Enter Sequence Adaptation Name"
                required={isSequenceAdaptation}
              />
            </fieldset>
          {/if}

          <fieldset>
            <button
              class="st-button w-full"
              disabled={createButtonDisabled || creatingDictionary}
              type="submit"
              use:permissionHandler={{
                hasPermission: hasCreatePermission,
                permissionError: createPermissionError,
              }}
            >
              {#if creatingDictionary}
                Creating...
                <HourglassIcon />
              {:else}
                Create
              {/if}
            </button>
          </fieldset>
        </form>
      </svelte:fragment>
    </Panel>

    <div class="table-container">
      <DictionaryTable
        dictionaries={$commandDictionaries}
        hasDeletePermission={featurePermissions.commandDictionary.canDelete(data.user)}
        isEditingDictionaries={true}
        type={'Command'}
        user={data.user}
        on:delete={deleteCommandDictionary}
      />

      <DictionaryTable
        dictionaries={$channelDictionaries}
        hasDeletePermission={featurePermissions.channelDictionary.canDelete(data.user)}
        isEditingDictionaries={true}
        type={'Channel'}
        user={data.user}
        on:delete={deleteChannelDictionary}
      />

      <DictionaryTable
        dictionaries={$parameterDictionaries}
        hasDeletePermission={featurePermissions.parameterDictionary.canDelete(data.user)}
        isEditingDictionaries={true}
        type={'Parameter'}
        user={data.user}
        on:delete={deleteParameterDictionary}
      />

      <DictionaryTable
        dictionaries={$sequenceAdaptations}
        hasDeletePermission={featurePermissions.sequenceAdaptation.canDelete(data.user)}
        isEditingDictionaries={true}
        type={'Sequence'}
        user={data.user}
        on:delete={deleteSequenceAdaptation}
      />
    </div>
  </CssGrid>
</CssGrid>

<style>
  .table-container {
    display: grid;
  }
</style>
