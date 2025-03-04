<svelte:options immutable={true} />

<script lang="ts">
  import { parcels, userSequencesColumns } from '../../stores/sequencingTemplates';
  import type { User } from '../../types/app';
  import type { Parcel, SequenceTemplate } from '../../types/sequencing';
  import effects from '../../utilities/effects';
  import { showTemplateModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import SequenceTemplateEditor from './SequenceTemplateEditor.svelte';
  import SequenceTemplateTable from './SequenceTemplateTable.svelte';
  import XIcon from 'bootstrap-icons/icons/x.svg?component';

  export let user: User | null;

  let filterText: string = '';
  let parcel: Parcel | null;
  let selectedTemplate: SequenceTemplate | null = null;
  let sequenceTemplateRows: string;

  $: sequenceTemplateRows = selectedTemplate !== null ? "1fr 3px 1fr" : "none";

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
  <CssGrid rows={sequenceTemplateRows}>
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


    {#if selectedTemplate}
      <CssGridGutter track={1} type="row" />
      <Panel>
        <svelte:fragment slot="header">
          <slot name="left">
            <SectionTitle>Sequence Template Details</SectionTitle>
          </slot>
          <slot name="right">
            <button
              class="st-button icon fs-6"
              on:click={() => selectedTemplate = null}
              use:tooltip={{ content: 'Deselect sequence template', placement: 'top' }}
            >
              <XIcon />
          </button>
          </slot>
        </svelte:fragment>
        <svelte:fragment slot="body">
          <Input layout="inline">
            Id
            <input class="st-input w-100" disabled={true} name="id" value={selectedTemplate.id} />
          </Input>
          <Input layout="inline">
            Name
            <input class="st-input w-100" disabled={true} name="name" value={selectedTemplate.name} />
          </Input>
          <Input layout="inline">
            Owner
            <input class="st-input w-100" disabled={true} name="owner" value={selectedTemplate.owner} />
          </Input>
          <Input layout="inline">
            Model Id
            <input class="st-input w-100" disabled={true} name="modelId" value={selectedTemplate.model_id} />
          </Input>
          <Input layout="inline">
            Parcel Id
            <input class="st-input w-100" disabled={true} name="parcelId" value={selectedTemplate.parcel_id} />
          </Input>
          <Input layout="inline">
            Language
            <input class="st-input w-100" disabled={true} name="language" value={selectedTemplate.language} />
          </Input>
          <Input layout="inline">
            Activity Type
            <input class="st-input w-100" disabled={true} name="activityType" value={selectedTemplate.activity_type} />
          </Input>
        </svelte:fragment>
      </Panel>
    {/if}
  </CssGrid>

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
