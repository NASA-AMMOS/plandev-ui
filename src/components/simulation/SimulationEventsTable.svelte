<svelte:options immutable={true} />

<script lang="ts">
  import type { ColDef, ColumnState } from 'ag-grid-community';
  import type { RowId } from '../../types/data-grid';
  import type { SimulationEvent } from '../../types/simulation';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';

  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let dataGrid: DataGrid<SimulationEvent> | undefined = undefined;
  export let selectedSimulationEventId: number | null = null;
  export let simulationEvents: SimulationEvent[] = [];
  export let filterExpression: string = '';

  let selectedItemIds: RowId[] = [];

  $: if (selectedSimulationEventId != null && !selectedItemIds.includes(selectedSimulationEventId)) {
    selectedItemIds = [selectedSimulationEventId];
  } else if (selectedSimulationEventId === null) {
    selectedItemIds = [];
  }

  function getRowId(simulationEvent: SimulationEvent): number {
    return simulationEvent.id;
  }
</script>

<DataGrid
  bind:this={dataGrid}
  bind:currentSelectedRowId={selectedSimulationEventId}
  bind:selectedRowIds={selectedItemIds}
  autoSizeColumnsToFit={false}
  columnDefs={[...(columnDefs ?? [])]}
  {columnStates}
  {filterExpression}
  {getRowId}
  useCustomContextMenu
  rowData={simulationEvents}
  rowSelection="single"
  scrollToSelection={true}
  suppressDragLeaveHidesColumns={false}
  on:columnMoved
  on:columnPinned
  on:columnResized
  on:columnVisible
  on:gridSizeChanged
  on:rowDoubleClicked
  on:selectionChanged
/>
