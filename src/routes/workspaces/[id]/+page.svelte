<svelte:options immutable={true} />

<script lang="ts">
  import { page } from '$app/stores';
  import SequenceEditor from '../../../components/sequencing/SequenceEditor.svelte';
  import CssGrid from '../../../components/ui/CssGrid.svelte';
  import CssGridGutter from '../../../components/ui/CssGridGutter.svelte';
  import Panel from '../../../components/ui/Panel.svelte';
  import SectionTitle from '../../../components/ui/SectionTitle.svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { parcel, workspaceColumns, workspaceId } from '../../../stores/workspaces';
  import effects from '../../../utilities/effects';
  import type { PageData } from './$types';

  export let data: PageData;

  const { initialWorkspace, user } = data;

  let selectedSequenceDefinition: string | null = null;
  let selectedSequenceId: string | null = null;

  $: if (initialWorkspace) {
    $workspaceId = initialWorkspace.id;
    selectedSequenceId = $page.url.searchParams.get(SearchParameters.SEQUENCE_ID);
  }

  $: getSelectedSequenceDefinition(selectedSequenceId);

  async function getSelectedSequenceDefinition(sequenceId: string | null) {
    if (sequenceId !== null) {
      selectedSequenceDefinition = await effects.getSequenceDefinition(sequenceId, user);
    } else {
      selectedSequenceDefinition = null;
    }
  }
</script>

<CssGrid bind:columns={$workspaceColumns}>
  <Panel borderRight padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>Workspace</SectionTitle>
      <div>hi</div>
    </svelte:fragment>
    <svelte:fragment slot="body">
      {data.workspaceId}
    </svelte:fragment>
  </Panel>
  <CssGridGutter track={1} type="column" />

  <SequenceEditor
    parcel={$parcel}
    showCommandFormBuilder={true}
    sequenceDefinition={selectedSequenceDefinition}
    title="Sequence - Definition Editor"
    {user}
    readOnly={false}
    workspaceId={$workspaceId}
    on:sequence
    on:didChangeModelContent
  />
</CssGrid>

<style>
</style>
