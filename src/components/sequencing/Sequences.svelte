<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { SearchParameters } from '../../enums/searchParameters';
  import { actionDefinitionsByWorkspace } from '../../stores/actions';
  import { parcels, userSequences, userSequencesColumns, workspaces } from '../../stores/sequencing';
  import type { ActionDefinition } from '../../types/actions';
  import type { User } from '../../types/app';
  import type { Parcel, UserSequence, Workspace } from '../../types/sequencing';
  import effects from '../../utilities/effects';
  import { getSearchParameterNumber, setQueryParam } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { satfToSequence } from '../../utilities/sequence-editor/languages/satf/satf-sasf-utils';
  import { pluralize } from '../../utilities/text';
  import Input from '../form/Input.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import WorkspaceTable from '../workspace/WorkspaceTable.svelte';
  import SequenceEditor from './SequenceEditor.svelte';
  import SequenceTable from './SequenceTable.svelte';

  export let user: User | null;

  let filterText: string = '';
  let parcel: Parcel | null;
  let selectedSequence: UserSequence | null = null;
  let workspace: Workspace | undefined;
  let workspaceId: number | null = null;
  let workspaceActions: Record<number, ActionDefinition> | null;
  let workspaceActionsCount: number = 0;

  $: parcel = $parcels.find(p => p.id === selectedSequence?.parcel_id) ?? null;
  $: workspace = $workspaces.find(workspace => workspace.id === workspaceId);
  $: if (selectedSequence !== null) {
    const found: number = $userSequences.findIndex(sequence => sequence.id === selectedSequence?.id);

    if (found === -1) {
      selectedSequence = null;
    }
  }
  $: workspaceActions = typeof workspaceId === 'number' ? $actionDefinitionsByWorkspace[workspaceId] : null;
  $: workspaceActionsCount = Object.keys(workspaceActions ?? {}).length;

  onMount(() => {
    workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID);
  });

  function onSequenceSelected(event: CustomEvent<UserSequence>) {
    selectedSequence = event.detail;
  }

  function onWorkspaceSelected(event: CustomEvent<number>) {
    workspaceId = event.detail;

    if (browser) {
      setQueryParam(SearchParameters.WORKSPACE_ID, workspaceId !== null ? `${workspaceId}` : null);
    }
  }

  function navigateToNewSequence(): void {
    const workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID);
    goto(`${base}/sequencing/new${workspaceId ? `?${SearchParameters.WORKSPACE_ID}=${workspaceId}` : ''}`);
  }

  function navigateToActions(): void {
    const workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID);
    goto(`${base}/sequencing/actions${workspaceId ? `?${SearchParameters.WORKSPACE_ID}=${workspaceId}` : ''}`);
  }

  async function importLibrary(): Promise<void> {
    const library = await effects.importLibrarySequences(workspaceId);
    if (!library) {
      return;
    }

    const parcel = library.parcel;
    const sequences = (await satfToSequence(library.fileContents)).sequences;
    sequences.forEach(async seqN => {
      await effects.createUserSequence(
        {
          definition: seqN.sequence,
          is_locked: false,
          name: seqN.name,
          parcel_id: parcel,
          seq_json: '',
          workspace_id: workspaceId !== null ? workspaceId : -1,
        },
        user,
      );
    });
  }
</script>

<CssGrid bind:columns={$userSequencesColumns}>
  <WorkspaceTable {user} selectedWorkspaceId={workspace?.id} on:workspaceSelected={onWorkspaceSelected} />

  <CssGridGutter track={1} type="column" />

  <Panel>
    <svelte:fragment slot="header">
      <SectionTitle>Sequences</SectionTitle>

      <Input>
        <input
          bind:value={filterText}
          class="st-input"
          placeholder="Filter sequences"
          aria-label="Filter sequences"
          style="width: 100%;"
        />
      </Input>

      <div class="right">
        <button
          class="st-button secondary ellipsis actions-button"
          disabled={workspace === undefined}
          on:click={navigateToActions}
        >
          {#if workspaceActionsCount > 0}
            <div class="actions-chip">{workspaceActionsCount}</div>
          {/if}
          Action{pluralize(workspaceActionsCount)}
        </button>

        <button
          class="st-button secondary ellipsis"
          use:permissionHandler={{
            hasPermission: featurePermissions.sequences.canCreate(user),
            permissionError: 'You do not have permission to create a new sequence',
          }}
          disabled={workspace === undefined}
          on:click={navigateToNewSequence}
        >
          New Sequence
        </button>

        <button
          class="st-button secondary ellipsis"
          use:permissionHandler={{
            hasPermission: featurePermissions.sequences.canCreate(user),
            permissionError: 'You do not have permission to upload library sequences',
          }}
          disabled={workspace === undefined}
          on:click|stopPropagation={importLibrary}
        >
          Import Library
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      <SequenceTable {filterText} {user} {workspace} on:sequenceSelected={onSequenceSelected} />
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={3} type="column" />

  <SequenceEditor
    {parcel}
    showCommandFormBuilder={false}
    sequenceDefinition={selectedSequence?.definition ?? ''}
    sequenceName={selectedSequence?.name}
    sequenceOutput={selectedSequence?.seq_json}
    title="Sequence - Definition Editor (Read-only)"
    previewOnly={true}
    {workspaceId}
    {user}
  />
</CssGrid>

<style>
  .right {
    column-gap: 5px;
    display: flex;
    flex-wrap: nowrap;
  }

  .actions-button {
    display: flex;
    gap: 4px;
  }

  .actions-chip {
    background-color: var(--st-gray-15);
    border-radius: 40px;
    color: black;
    min-width: 16px;
    padding: 0px 4px;
  }
</style>
