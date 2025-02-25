<svelte:options immutable={true} />

<script lang="ts">
  import { parcels, userSequences, userSequencesColumns } from '../../stores/sequencingTemplates';
  import type { User } from '../../types/app';
  import type { Parcel, UserSequence } from '../../types/sequencing';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import Input from '../form/Input.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import SequenceTemplateEditor from './SequenceTemplateEditor.svelte';
  import SequenceTemplateTable from './SequenceTemplateTable.svelte';

  export let user: User | null;

  let filterText: string = '';
  let parcel: Parcel | null;
  let selectedSequence: UserSequence | null = null;

  $: parcel = $parcels.find(p => p.id === selectedSequence?.parcel_id) ?? null;
  $: if (selectedSequence !== null) {
    const found: number = $userSequences.findIndex(sequence => sequence.id === selectedSequence?.id);

    if (found === -1) {
      selectedSequence = null;
    }
  }

  function onSequenceSelected(event: CustomEvent<UserSequence>) {
    selectedSequence = event.detail;
  }

  function createSequenceTemplate(): void {
    // TODO: populate this method
  }
</script>

<CssGrid bind:columns={$userSequencesColumns}>
  <Panel>
    <svelte:fragment slot="header">
      <SectionTitle>Sequence Templates</SectionTitle>

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
          on:click={createSequenceTemplate}
        >
          New Template
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      <SequenceTemplateTable {filterText} {user} on:sequenceSelected={onSequenceSelected} />
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <SequenceTemplateEditor
    {parcel}
    showCommandFormBuilder={false}
    sequenceDefinition={selectedSequence?.definition ?? ''}
    sequenceName={selectedSequence?.name}
    sequenceOutput={selectedSequence?.seq_json}
    {user}
  />
</CssGrid>

<style>
  .right {
    column-gap: 5px;
    display: flex;
    flex-wrap: nowrap;
  }
</style>
