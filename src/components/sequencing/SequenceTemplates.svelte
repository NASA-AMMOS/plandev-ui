<svelte:options immutable={true} />

<script lang="ts">
  import { userTemplates } from '../../stores/sequencing';
  import { parcels, userSequencesColumns } from '../../stores/sequencingTemplates';
  import type { User } from '../../types/app';
  import type { Parcel, UserSequenceTemplate } from '../../types/sequencing';
  import effects from '../../utilities/effects';
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
  let selectedDefinition: string = '';
  $: console.log(selectedTemplate);

  $: parcel = $parcels.find(p => p.id === selectedTemplate?.parcel_id) ?? null;
  $: if (selectedTemplate !== null) {
    const found: number = $userTemplates.findIndex(template => template.id === selectedTemplate?.id);

    if (found === -1) {
      selectedTemplate = null;
    }
  }
  $: if (selectedTemplate !== null) {
    selectedTemplate.definition = selectedDefinition;
  }

  function onTemplateSelected(event: CustomEvent<UserSequenceTemplate>) {
    selectedTemplate = event.detail;
    selectedDefinition = selectedTemplate.definition;
  }

  let id = 1;
  function createSequenceTemplate(): void {
    // TODO: add a selection here for template name and parcel?
    effects.createUserSequenceTemplate(
      {
        definition: '',
        name: 'New Template ' + id++,
        parcel_id: 0,
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
          on:click={createSequenceTemplate}
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

  <!-- TODO: I don't love this way of binding the template definition into the editor... I'm not sure how else to handle this, though. -->
  <SequenceTemplateEditor
    {parcel}
    showCommandFormBuilder={false}
    bind:sequenceDefinition={selectedDefinition}
    sequenceName={selectedTemplate?.name}
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
