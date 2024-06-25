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
  import { DictionaryTypes } from '../../enums/dictionaryTypes';
  import {
    channelDictionaries,
    commandDictionaries,
    parameterDictionaries,
    sequenceAdaptations,
  } from '../../stores/sequencing';
  import effects from '../../utilities/effects';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import type { PageData } from './$types';

  export let data: PageData;

  const createPermissionError = 'You do not have permission to create Command Dictionaries';

  let createButtonDisabled: boolean = false;
  let createDictionaryError: string | null = null;
  let creatingDictionary: boolean = false;
  let files: FileList;
  let file: File;
  let fileInput: HTMLInputElement;
  let isSequenceAdaptation: boolean = false;
  let sequenceAdaptationName: string;

  $: hasCreatePermission = featurePermissions.commandDictionary.canCreate(data.user);
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
      const uploadedDictionaryOrAdaptation = await effects.uploadDictionaryOrAdaptation(
        file,
        data.user,
        sequenceAdaptationName,
      );

      if (uploadedDictionaryOrAdaptation === null) {
        throw Error('Failed to upload file');
      }

      switch (uploadedDictionaryOrAdaptation.type) {
        case DictionaryTypes.COMMAND: {
          showSuccessToast('Command Dictionary Created Successfully');
          break;
        }
        case DictionaryTypes.CHANNEL: {
          showSuccessToast('Channel Dictionary Created Successfully');
          break;
        }
        case DictionaryTypes.PARAMETER: {
          showSuccessToast('Parameter Dictionary Created Successfully');
          break;
        }
        case DictionaryTypes.ADAPTATION: {
          showSuccessToast('Sequence Adaptation Created Successfully');
          break;
        }
      }

      fileInput.value = '';
      isSequenceAdaptation = false;
      sequenceAdaptationName = '';
    } catch (e) {
      createDictionaryError = (e as Error).message;
      showFailureToast('Command Dictionary Create Failed');
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
              accept=".xml,.js"
              class="w-100 st-typography-body"
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
                class="st-input w-100"
                name="sequenceAdaptationName"
                placeholder="Enter Sequence Adaptation Name"
                required={isSequenceAdaptation}
              />
            </fieldset>
          {/if}

          <fieldset>
            <button
              class="st-button w-100"
              disabled={createButtonDisabled}
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
        type={'Command'}
        user={data.user}
        on:delete={deleteCommandDictionary}
      />

      <DictionaryTable
        dictionaries={$channelDictionaries}
        type={'Channel'}
        user={data.user}
        on:delete={deleteChannelDictionary}
      />

      <DictionaryTable
        dictionaries={$parameterDictionaries}
        type={'Parameter'}
        user={data.user}
        on:delete={deleteParameterDictionary}
      />

      <DictionaryTable
        dictionaries={$sequenceAdaptations}
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
