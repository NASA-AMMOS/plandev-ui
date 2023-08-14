<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { commandDictionaries, userSequenceFormColumns } from '../../stores/sequencing';
  import type { User, UserId } from '../../types/app';
  import type { UserSequence, UserSequenceInsertInput } from '../../types/sequencing';
  import effects from '../../utilities/effects';
  import { isSaveEvent } from '../../utilities/keyboardEvents';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import PageTitle from '../app/PageTitle.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import SequenceEditor from './SequenceEditor.svelte';

  export let initialSequenceCommandDictionaryId: number | null = null;
  export let initialSequenceCreatedAt: string | null = null;
  export let initialSequenceDefinition: string = `export default () =>\n  Sequence.new({\n    seqId: '',\n    metadata: {},\n    steps: []\n  });\n`;
  export let initialSequenceId: number | null = null;
  export let initialSequenceName: string = '';
  export let initialSequenceOwner: UserId = '';
  export let initialSequenceUpdatedAt: string | null = null;
  export let mode: 'create' | 'edit' = 'create';
  export let user: User | null;

  let hasPermission: boolean = false;
  let pageSubtitle: string = '';
  let pageTitle: string = '';
  let permissionError = 'You do not have permission to edit this sequence.';
  let saveButtonClass: 'primary' | 'secondary' = 'primary';
  let savedSequenceDefinition: string = mode === 'create' ? '' : initialSequenceDefinition;
  let seqJsonFiles: FileList;
  let sequenceCreatedAt: string | null = initialSequenceCreatedAt;
  let sequenceDefinition: string = initialSequenceDefinition;
  let sequenceCommandDictionaryId: number | null = initialSequenceCommandDictionaryId;
  let sequenceId: number | null = initialSequenceId;
  let sequenceModified: boolean = false;
  let sequenceName: string = initialSequenceName;
  let sequenceOwner: UserId = initialSequenceOwner;
  let savedSequenceName: string = sequenceName;
  let sequenceSeqJson: string = 'Seq JSON has not been generated yet';
  let sequenceUpdatedAt: string | null = initialSequenceUpdatedAt;
  let saveButtonEnabled: boolean = false;
  let saveButtonText: string = '';
  let savingSequence: boolean = false;

  $: saveButtonClass = sequenceModified && saveButtonEnabled ? 'primary' : 'secondary';
  $: saveButtonEnabled = sequenceCommandDictionaryId !== null && sequenceDefinition !== '' && sequenceName !== '';
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

  onMount(() => {
    if (mode === 'edit') {
      getUserSequenceSeqJson();
    }
  });

  async function getUserSequenceFromSeqJson() {
    const file: File = seqJsonFiles[0];
    const text = await file.text();
    const seqJson = JSON.parse(text);
    const sequence = await effects.getUserSequenceFromSeqJson(seqJson, user);
    sequenceDefinition = sequence;
    sequenceSeqJson = text;
  }

  async function getUserSequenceSeqJson(): Promise<void> {
    sequenceSeqJson = 'Generating Seq JSON...';
    sequenceSeqJson = await effects.getUserSequenceSeqJson(sequenceCommandDictionaryId, sequenceDefinition, user);
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

  async function saveSequence() {
    if (saveButtonEnabled) {
      savingSequence = true;

      if (sequenceCommandDictionaryId !== null) {
        if (mode === 'create') {
          const newSequence: UserSequenceInsertInput = {
            authoring_command_dict_id: sequenceCommandDictionaryId,
            definition: sequenceDefinition,
            name: sequenceName,
          };
          const newSequenceId = await effects.createUserSequence(newSequence, user);

          if (newSequenceId !== null) {
            goto(`${base}/sequencing/edit/${newSequenceId}`);
          }
        } else if (mode === 'edit' && sequenceId !== null) {
          const updatedSequence: Partial<UserSequence> = {
            authoring_command_dict_id: sequenceCommandDictionaryId,
            definition: sequenceDefinition,
            name: sequenceName,
          };
          const updated_at = await effects.updateUserSequence(sequenceId, updatedSequence, user);
          if (updated_at !== null) {
            sequenceUpdatedAt = updated_at;
          }
          await getUserSequenceSeqJson();
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
        <label for="commandDictionary">Command Dictionary (required)</label>
        <select
          bind:value={sequenceCommandDictionaryId}
          class="st-select w-100"
          name="commandDictionary"
          use:permissionHandler={{
            hasPermission,
            permissionError,
          }}
        >
          <option value={null} />
          {#each $commandDictionaries as commandDictionary}
            <option value={commandDictionary.id}>
              {commandDictionary.mission} -
              {commandDictionary.version}
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
        <label for="seqJsonFile">Create Sequence from Seq JSON (optional)</label>
        <input
          bind:files={seqJsonFiles}
          class="w-100"
          name="seqJsonFile"
          type="file"
          on:change={getUserSequenceFromSeqJson}
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
    {sequenceCommandDictionaryId}
    {sequenceDefinition}
    {sequenceName}
    {sequenceSeqJson}
    title="{mode === 'create' ? 'New' : 'Edit'} Sequence - Definition Editor"
    {user}
    readOnly={!hasPermission}
    on:didChangeModelContent={onDidChangeModelContent}
    on:generate={getUserSequenceSeqJson}
  />
</CssGrid>
