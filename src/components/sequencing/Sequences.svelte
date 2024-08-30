<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { SearchParameters } from '../../enums/searchParameters';
  import { parcels, userSequences, userSequencesColumns, workspaces } from '../../stores/sequencing';
  import type { User } from '../../types/app';
  import type { Parcel, UserSequence, Workspace } from '../../types/sequencing';
  import { getSearchParameterNumber, setQueryParam } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
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

  $: parcel = $parcels.find(p => p.id === selectedSequence?.parcel_id) ?? null;
  $: workspace = $workspaces.find(workspace => workspace.id === workspaceId);
  $: if (selectedSequence !== null) {
    const found = $userSequences.findIndex(sequence => sequence.id === selectedSequence?.id);

    if (found === -1) {
      selectedSequence = null;
    }
  }

  onMount(() => {
    workspaceId = getSearchParameterNumber(SearchParameters.WORKSPACE_ID);
  });

  function onSequenceSelected(event: CustomEvent<UserSequence>) {
    selectedSequence = event.detail;
  }

  function onWorkspaceSelected(event: CustomEvent<number>) {
    workspaceId = event.detail;

    if (browser) {
      setQueryParam(SearchParameters.WORKSPACE_ID, `${workspaceId}` ?? null);
    }
  }
</script>

<CssGrid bind:columns={$userSequencesColumns}>
  <WorkspaceTable {user} selectedWorkspaceId={workspace?.id} on:workspaceSelected={onWorkspaceSelected} />

  <CssGridGutter track={1} type="column" />

  <Panel>
    <svelte:fragment slot="header">
      <SectionTitle>Sequences</SectionTitle>

      <Input>
        <input bind:value={filterText} class="st-input" placeholder="Filter sequences" style="width: 100%;" />
      </Input>

      <div class="right">
        <button
          class="st-button secondary ellipsis"
          use:permissionHandler={{
            hasPermission: featurePermissions.sequences.canCreate(user),
            permissionError: 'You do not have permission to create a new sequence',
          }}
          disabled={workspace === undefined}
          on:click={() => {
            goto(
              `${base}/sequencing/new${'?' + SearchParameters.WORKSPACE_ID + '=' + getSearchParameterNumber(SearchParameters.WORKSPACE_ID) ?? ''}`,
            );
          }}
        >
          New Sequence
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      <SequenceTable {filterText} {user} {workspace} on:sequenceSelected={onSequenceSelected} />
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <SequenceEditor
    {parcel}
    showCommandFormBuilder={false}
    sequenceDefinition={selectedSequence?.definition ?? ''}
    sequenceName={selectedSequence?.name}
    sequenceOutput={selectedSequence?.seq_json}
    title="Sequence - Definition Editor (Read-only)"
    readOnly={true}
    {user}
  />
</CssGrid>
