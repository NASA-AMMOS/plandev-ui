<svelte:options immutable={true} />

<script lang="ts">
  import { selectedExternalEventId, selectedExternalEvents, selectExternalEvent } from '../../stores/external-event';
  import { viewTogglePanel } from '../../stores/views';
  import type { TRowData } from '../../types/data-grid';
  import type { ExternalEvent } from '../../types/external-event';
  import type { ViewGridSection } from '../../types/view';
  import { getExternalEventWholeRowId } from '../../utilities/externalEvents';
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import ExternalEventsTable from './ExternalEventsTable.svelte';

  export let gridSection: ViewGridSection;

  let filterExpression: string = '';

  function onRowDoubleClicked() {
    viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'ExternalEventFormPanel' } });
  }

  function onSelectionChanged(e: CustomEvent<TRowData[]>) {
    if (e.detail && e.detail.length) {
      const externalEvent = e.detail[0] as ExternalEvent;
      selectExternalEvent(getExternalEventWholeRowId(externalEvent));
    }
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="External Events Table" />
    <div class="table-menu">
      <input type="search" bind:value={filterExpression} placeholder="Filter External Events" class="st-input" />
    </div>
  </svelte:fragment>
  <svelte:fragment slot="body">
    <ExternalEventsTable
      selectedItemId={$selectedExternalEventId}
      {filterExpression}
      items={$selectedExternalEvents}
      on:rowDoubleClicked={onRowDoubleClicked}
      on:selectionChanged={onSelectionChanged}
    />
  </svelte:fragment>
</Panel>

<style>
  .table-menu {
    column-gap: 1rem;
    display: flex;
  }
</style>
