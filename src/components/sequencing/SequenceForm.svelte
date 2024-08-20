<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { ParameterDictionary } from '@nasa-jpl/aerie-ampcs';
  import { outputFormat } from '../../stores/sequence-adaptation';
  import {
    parameterDictionaries as parameterDictionariesStore,
    parcelToParameterDictionaries,
    parcels,
    userSequenceFormColumns,
  } from '../../stores/sequencing';
  import type { User, UserId } from '../../types/app';
  import type { Parcel, UserSequence, UserSequenceInsertInput } from '../../types/sequencing';
  import effects from '../../utilities/effects';
  import { isSaveEvent } from '../../utilities/keyboardEvents';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { toInputFormat } from '../../utilities/sequence-editor/extension-points';
  import { logError } from '../../utilities/sequence-editor/logger';
  import PageTitle from '../app/PageTitle.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import SequenceEditor from './SequenceEditor.svelte';

  export let initialSequenceCreatedAt: string | null = null;
  export let initialSequenceDefinition: string = ``;
  export let initialSequenceId: number | null = null;
  export let initialSequenceName: string = '';
  export let initialSequenceOwner: UserId = '';
  export let initialSequenceParcelId: number | null = null;
  export let initialSequenceUpdatedAt: string | null = null;
  export let mode: 'create' | 'edit' = 'create';
  export let user: User | null;

  let hasPermission: boolean = false;
  let pageSubtitle: string = '';
  let pageTitle: string = '';
  let parcel: Parcel | null;
  let permissionError = 'You do not have permission to edit this sequence.';
  let saveButtonClass: 'primary' | 'secondary' = 'primary';
  let savedSequenceDefinition: string = mode === 'create' ? '' : initialSequenceDefinition;
  let outputFiles: FileList;
  let sequenceCreatedAt: string | null = initialSequenceCreatedAt;
  let sequenceDefinition: string = initialSequenceDefinition;
  let sequenceId: number | null = initialSequenceId;
  let sequenceModified: boolean = false;
  let sequenceName: string = initialSequenceName;
  let sequenceOwner: UserId = initialSequenceOwner;
  let sequenceParcelId: number | null = initialSequenceParcelId;
  let savedSequenceName: string = sequenceName;
  let sequenceOutput: string = 'Output has not been generated yet';
  let sequenceUpdatedAt: string | null = initialSequenceUpdatedAt;
  let saveButtonEnabled: boolean = false;
  let saveButtonText: string = '';
  let savingSequence: boolean = false;

  $: parcel = $parcels.find(p => p.id === sequenceParcelId) ?? null;
  $: saveButtonClass = sequenceModified && saveButtonEnabled ? 'primary' : 'secondary';
  $: saveButtonEnabled = sequenceParcelId !== null && sequenceDefinition !== '' && sequenceName !== '';
  $: sequenceModified = sequenceDefinition !== savedSequenceDefinition || sequenceName !== savedSequenceName;
  $: {
    hasPermission =
      mode === 'edit'
        ? featurePermissions.sequences.canUpdate(user, { owner: sequenceOwner })
        : featurePermissions.sequences.canCreate(user);
    permissionError = `You do not have permission to ${mode === 'edit' ? 'edit this' : 'create a'} sequence.`;
    pageTitle = mode === 'edit' ? 'Sequencing' : 'New Sequence';
    pageSubtitle = mode === 'edit' ? savedSequenceName : '';
    saveButtonText = mode === 'edit' && !sequenceModified ? 'Saved' : 'Save';
  }

  async function onOutputFileUpload(e: Event & { currentTarget: EventTarget & HTMLInputElement }) {
    const unparsedParameterDictionaries = $parameterDictionariesStore.filter(pd => {
      const parameterDictionary = $parcelToParameterDictionaries.find(
        p => p.parameter_dictionary_id === pd.id && p.parcel_id === parcel?.id,
      );

      if (parameterDictionary) {
        return pd;
      }
    });

    const [output, parsedChannelDictionary, ...parsedParameterDictionaries] = await Promise.all([
      parseOutputFromFile(e.currentTarget.files),
      parcel?.channel_dictionary_id
        ? effects.getParsedAmpcsChannelDictionary(parcel?.channel_dictionary_id, user)
        : null,
      ...unparsedParameterDictionaries.map(unparsedParameterDictionary => {
        return effects.getParsedAmpcsParameterDictionary(unparsedParameterDictionary.id, user);
      }),
    ]);

    if (output !== null) {
      const sequence = await toInputFormat(
        output,
        parsedParameterDictionaries.filter((pd): pd is ParameterDictionary => pd !== null),
        parsedChannelDictionary,
      );

      if (sequence !== undefined) {
        initialSequenceDefinition = sequence;
        sequenceOutput = '';
      }
    }
  }

  function onSequenceChange(event: CustomEvent<{ input: string; output: string }>) {
    const { detail } = event;
    const { input, output } = detail;
    sequenceDefinition = input;
    sequenceOutput = output;
  }

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    sequenceDefinition = value;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (isSaveEvent(event)) {
      event.preventDefault();
      saveSequence();
    }
  }

  async function parseOutputFromFile(files: FileList | null | undefined): Promise<string | null> {
    if (files) {
      const file = files.item(0);

      if (file) {
        try {
          return await file.text();
        } catch (e) {
          const errorMessage = (e as Error).message;
          logError(errorMessage);
          return null;
        }
      } else {
        logError('No file provided');
        return null;
      }
    } else {
      logError('No file provided');
      return null;
    }
  }

  async function saveSequence() {
    if (saveButtonEnabled) {
      savingSequence = true;

      if (sequenceParcelId !== null) {
        if (mode === 'create') {
          const newSequence: UserSequenceInsertInput = {
            definition: sequenceDefinition,
            name: sequenceName,
            parcel_id: sequenceParcelId,
            seq_json: sequenceOutput,
          };
          const newSequenceId = await effects.createUserSequence(newSequence, user);

          if (newSequenceId !== null) {
            goto(`${base}/sequencing/edit/${newSequenceId}`);
          }
        } else if (mode === 'edit' && sequenceId !== null) {
          const updatedSequence: Partial<UserSequence> = {
            definition: sequenceDefinition,
            name: sequenceName,
            parcel_id: sequenceParcelId,
            seq_json: sequenceOutput,
          };
          const updated_at = await effects.updateUserSequence(sequenceId, updatedSequence, sequenceOwner, user);
          if (updated_at !== null) {
            sequenceUpdatedAt = updated_at;
          }
          savedSequenceDefinition = sequenceDefinition;
          savedSequenceName = sequenceName;
        }
      }
      savingSequence = false;
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<PageTitle subTitle={pageSubtitle} title={pageTitle} />

<CssGrid bind:columns={$userSequenceFormColumns}>
  <Panel overflowYBody="hidden" padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>{mode === 'create' ? 'New Sequence' : 'Edit Sequence'}</SectionTitle>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/sequencing`)}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        <button
          class="st-button {saveButtonClass} ellipsis"
          disabled={!saveButtonEnabled}
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
          on:click={saveSequence}
        >
          {savingSequence ? 'Saving...' : saveButtonText}
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      {#if mode === 'edit'}
        <fieldset>
          <label for="ruleId">ID</label>
          <input class="st-input w-100" disabled name="ruleId" value={sequenceId} />
        </fieldset>

        <fieldset>
          <label for="createdAt">Created At</label>
          <input class="st-input w-100" disabled name="createdAt" value={sequenceCreatedAt} />
        </fieldset>

        <fieldset>
          <label for="updatedAt">Updated At</label>
          <input class="st-input w-100" disabled name="updatedAt" value={sequenceUpdatedAt} />
        </fieldset>
      {/if}

      <fieldset>
        <label for="parcel">Parcel (required)</label>
        <select
          bind:value={sequenceParcelId}
          class="st-select w-100"
          name="parcel"
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        >
          <option value={null} />
          {#each $parcels as parcel}
            <option value={parcel.id}>
              {parcel.name}
            </option>
          {/each}
        </select>
      </fieldset>

      <fieldset>
        <label for="sequenceName">Name (required)</label>
        <input
          bind:value={sequenceName}
          autocomplete="off"
          class="st-input w-100"
          name="sequenceName"
          placeholder="Enter Sequence Name"
          required
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        />
      </fieldset>

      <fieldset>
        <label for="outputFile">Create Sequence from {$outputFormat?.[0]?.name}</label>
        <input
          bind:files={outputFiles}
          class="w-100"
          name="outputFile"
          type="file"
          on:change={onOutputFileUpload}
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        />
      </fieldset>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <SequenceEditor
    {parcel}
    showCommandFormBuilder={true}
    sequenceDefinition={initialSequenceDefinition}
    {sequenceName}
    {sequenceOutput}
    title="{mode === 'create' ? 'New' : 'Edit'} Sequence - Definition Editor"
    {user}
    readOnly={!hasPermission}
    on:sequence={onSequenceChange}
    on:didChangeModelContent={onDidChangeModelContent}
  />
</CssGrid>
