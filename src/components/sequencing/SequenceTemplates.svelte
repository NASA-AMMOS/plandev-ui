<svelte:options immutable={true} />

<script lang="ts">
  import { userTemplates } from '../../stores/sequencing';
  import { parcels, userSequencesColumns } from '../../stores/sequencingTemplates';
  import type { User } from '../../types/app';
  import type { Parcel, UserSequenceTemplate } from '../../types/sequencing';
  import effects from '../../utilities/effects';
  import { showTemplateModal } from '../../utilities/modal';
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
  let selectedTemplate: UserSequenceTemplate | null = null;

  $: parcel = $parcels.find(p => p.id === selectedTemplate?.parcel_id) ?? null;
  $: if (selectedTemplate !== null) {
    const found: number = $userTemplates.findIndex(template => template.id === selectedTemplate?.id);

    if (found === -1) {
      selectedTemplate = null;
    }
  }

  function onTemplateSelected(event: CustomEvent<UserSequenceTemplate>) {
    selectedTemplate = event.detail;
  }
  function onTemplateChanged(event: CustomEvent<{ input: string; output: string }>) {
    if (selectedTemplate) {
      selectedTemplate.definition = event.detail.input;
    }
  }

  let id = 1;
  async function createSequenceTemplate(): Promise<void> {
    const { confirm, value } = await showTemplateModal();
    if (!confirm || value === undefined) return;

    effects.createUserSequenceTemplate(
      {
        definition: '',
        ...value,
      },
      user,
    );
  }
</script>

<CssGrid bind:columns={$userSequencesColumns}>
  <Panel>
    <svelte:fragment slot="header">
      <SectionTitle>Sequence Templates</SectionTitle>

      <Input>
        <input bind:value={filterText} class="st-input" placeholder="Filter templates" style="width: 100%;" />
      </Input>

      <div class="right">
        <button
          class="st-button secondary ellipsis"
          use:permissionHandler={{
            hasPermission: featurePermissions.sequences.canCreate(user),
            permissionError: 'You do not have permission to create a new sequence',
          }}
          on:click|stopPropagation={createSequenceTemplate}
        >
          New Template
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      <SequenceTemplateTable {filterText} {user} on:templateSelected={onTemplateSelected} />
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <SequenceTemplateEditor
    {parcel}
    showCommandFormBuilder={true}
    template={selectedTemplate}
    on:templateChanged={onTemplateChanged}
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
