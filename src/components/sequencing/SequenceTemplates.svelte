<svelte:options immutable={true} />

<script lang="ts">
  import { parcels, userSequencesColumns } from '../../stores/sequencingTemplates';
  import type { User } from '../../types/app';
  import type { Parcel, SequenceTemplate } from '../../types/sequencing';
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
  let selectedTemplate: SequenceTemplate | null = null;

  $: parcel = $parcels.find(p => p.id === selectedTemplate?.parcel_id) ?? null;

  function onTemplateSelected(event: CustomEvent<SequenceTemplate>) {
    selectedTemplate = event.detail;
  }

  function onTemplateChanged(event: CustomEvent<{ input: string; output: string }>) {
    if (selectedTemplate) {
      selectedTemplate.template_definition = event.detail.input;
    }
  }

  async function createSequenceTemplate(): Promise<void> {
    const { confirm, value } = await showTemplateModal();
    if (!confirm || value === undefined) return;

    effects.createSequenceTemplate(
      value.activityType,
      value.language,
      value.modelId,
      value.name,
      value.parcelId,
      '',
      user
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

  {#if selectedTemplate}
    <SequenceTemplateEditor
      {parcel}
      showCommandFormBuilder={true}
      template={selectedTemplate}
      on:templateChanged={onTemplateChanged}
      {user}
    />
  {:else}
    <div class="no-templates">No template selected</div>
  {/if}
</CssGrid>

<style>
  .right {
    column-gap: 5px;
    display: flex;
    flex-wrap: nowrap;
  }

  .no-templates {
    margin: 8px;
  }
</style>
