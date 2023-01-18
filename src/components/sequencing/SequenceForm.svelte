<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { user as userStore } from '../../stores/app';
  import { commandDictionaries, userSequencesColumns } from '../../stores/sequencing';
  import type { UserSequence, UserSequenceInsertInput } from '../../types/sequencing';
  import effects from '../../utilities/effects';
  import { isSaveEvent } from '../../utilities/keyboardEvents';
  import PageTitle from '../app/PageTitle.svelte';
  import Chip from '../ui/Chip.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SequenceEditor from './SequenceEditor.svelte';

  export let initialSequenceCommandDictionaryId: number | null = null;
  export let initialSequenceCreatedAt: string | null = null;
  export let initialSequenceDefinition: string = `export default () =>\n  Sequence.new({\n    seqId: '',\n    metadata: {},\n    commands: []\n  });\n`;
  export let initialSequenceId: number | null = null;
  export let initialSequenceName: string = '';
  export let initialSequenceUpdatedAt: string | null = null;
  export let mode: 'create' | 'edit' = 'create';

  let savedSequenceDefinition: string = mode === 'create' ? '' : initialSequenceDefinition;
  let seqJsonFiles: FileList;
  let sequenceCreatedAt: string | null = initialSequenceCreatedAt;
  let sequenceDefinition: string = initialSequenceDefinition;
  let sequenceCommandDictionaryId: number | null = initialSequenceCommandDictionaryId;
  let sequenceId: number | null = initialSequenceId;
  let sequenceName: string = initialSequenceName;
  let savedSequenceName: string = sequenceName;
  let sequenceSeqJson: string = 'Seq JSON has not been generated yet';
  let sequenceUpdatedAt: string | null = initialSequenceUpdatedAt;
  let saveButtonEnabled: boolean = false;
  let savingSequence: boolean = false;

  $: saveButtonEnabled = sequenceCommandDictionaryId !== null && sequenceDefinition !== '' && sequenceName !== '';
  $: sequenceModified = sequenceDefinition !== savedSequenceDefinition || sequenceName !== savedSequenceName;
  $: saveButtonText = mode === 'edit' && !sequenceModified ? 'Saved' : 'Save';
  $: saveButtonClass = sequenceModified && saveButtonEnabled ? 'primary' : 'secondary';
  $: pageTitle = mode === 'edit' ? 'Sequencing' : 'New Sequence';
  $: pageSubtitle = mode === 'edit' ? savedSequenceName : '';

  onMount(() => {
    if (mode === 'edit') {
      getUserSequenceSeqJson();
    }
  });

  async function getUserSequenceFromSeqJson() {
    const file: File = seqJsonFiles[0];
    const text = await file.text();
    const seqJson = JSON.parse(text);
    const sequence = await effects.getUserSequenceFromSeqJson(seqJson);
    sequenceDefinition = sequence;
    sequenceSeqJson = text;
  }

  async function getUserSequenceSeqJson(): Promise<void> {
    sequenceSeqJson = 'Generating Seq JSON...';
    sequenceSeqJson = await effects.getUserSequenceSeqJson(sequenceCommandDictionaryId, sequenceDefinition);
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
      if (mode === 'create') {
        const newSequence: UserSequenceInsertInput = {
          authoring_command_dict_id: sequenceCommandDictionaryId,
          definition: sequenceDefinition,
          name: sequenceName,
          owner: $userStore?.id,
        };
        const newSequenceId = await effects.createUserSequence(newSequence);

        if (newSequenceId !== null) {
          goto(`${base}/sequencing/edit/${newSequenceId}`);
        }
      } else if (mode === 'edit') {
        const updatedSequence: Partial<UserSequence> = {
          authoring_command_dict_id: sequenceCommandDictionaryId,
          definition: sequenceDefinition,
          name: sequenceName,
        };
        const updated_at = await effects.updateUserSequence(sequenceId, updatedSequence);
        if (updated_at !== null) {
          sequenceUpdatedAt = updated_at;
        }
        await getUserSequenceSeqJson();
        savedSequenceDefinition = sequenceDefinition;
        savedSequenceName = sequenceName;
      }
      savingSequence = false;
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<PageTitle subTitle={pageSubtitle} title={pageTitle} />

<CssGrid bind:columns={$userSequencesColumns}>
  <Panel overflowYBody="hidden" padBody={false}>
    <svelte:fragment slot="header">
      <Chip>{mode === 'create' ? 'New Sequence' : 'Edit Sequence'}</Chip>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/sequencing`)}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        <button class="st-button {saveButtonClass} ellipsis" disabled={!saveButtonEnabled} on:click={saveSequence}>
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
        <select bind:value={sequenceCommandDictionaryId} class="st-select w-100" name="commandDictionary">
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
    on:didChangeModelContent={onDidChangeModelContent}
    on:generate={getUserSequenceSeqJson}
  />
</CssGrid>
