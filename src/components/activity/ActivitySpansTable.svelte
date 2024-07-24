<svelte:options immutable={true} />

<script lang="ts">
  import type { ColDef, ColumnState } from 'ag-grid-community';
  import type { RowId } from '../../types/data-grid';
  import type { Span, SpanId } from '../../types/simulation';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';

  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let dataGrid: DataGrid<Span> | undefined = undefined;
  export let selectedSpanId: SpanId | null = null;
  export let spans: Span[] = [];
  export let filterExpression: string = '';

  let selectedItemIds: RowId[] = [];

  $: if (selectedSpanId != null && !selectedItemIds.includes(selectedSpanId)) {
    selectedItemIds = [selectedSpanId];
  } else if (selectedSpanId === null) {
    selectedItemIds = [];
  }

  function getRowId(span: Span): SpanId {
    return span.span_id;
  }
</script>

<DataGrid
  bind:this={dataGrid}
  bind:currentSelectedRowId={selectedSpanId}
  bind:selectedRowIds={selectedItemIds}
  autoSizeColumnsToFit={false}
  columnDefs={[...(columnDefs ?? [])]}
  {columnStates}
  {filterExpression}
  {getRowId}
  useCustomContextMenu
  rowData={spans}
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
