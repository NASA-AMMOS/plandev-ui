<svelte:options immutable={true} />

<script lang="ts">
  import type { ValueGetterParams } from 'ag-grid-community';
  import { plugins } from '../../stores/plugins';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ExternalEvent, ExternalEventId } from '../../types/external-event';
  import type { ExternalSourceSlim } from '../../types/external-source';
  import { getExternalEventWholeRowId } from '../../utilities/externalEvents';
  import { formatDate } from '../../utilities/time';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';

  export let selectedItemId: ExternalEventId | null;
  export let items: ExternalEvent[];
  export let filterExpression = '';

  const baseColumnDefs: DataGridColumnDef[] = [
    {
      field: 'pkey',
      filter: 'text',
      headerName: 'Key',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<ExternalEvent>) => {
        if (params.data?.pkey) {
          return params.data.pkey.key;
        }
      },
    },
    {
      field: 'event_type_name',
      filter: 'text',
      headerName: 'Event Type',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<ExternalEvent>) => {
        if (params.data?.pkey) {
          return params.data.pkey.event_type_name;
        }
      },
    },
    {
      field: 'pkey',
      filter: 'number',
      headerName: 'Source Key',
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<ExternalEvent>) => {
        if (params.data?.pkey) {
          return params.data.pkey.source_key;
        }
      },
    },
    {
      field: 'duration',
      filter: 'text',
      headerName: 'Duration',
      resizable: true,
      sortable: true,
    },
  ];

  let columnDefs = baseColumnDefs;

  $: columnDefs = [
    ...baseColumnDefs,
    {
      field: 'start_time',
      filter: 'text',
      headerName: `Start Time (${$plugins.time.primary.label})`,
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<ExternalSourceSlim>) => {
        if (params.data?.start_time) {
          return formatDate(new Date(params.data?.start_time), $plugins.time.primary.format);
        }
      },
    },
  ];
</script>

<DataGrid
  selectedRowIds={[selectedItemId ?? '']}
  {columnDefs}
  {filterExpression}
  getRowId={getExternalEventWholeRowId}
  useCustomContextMenu
  rowData={items}
  rowSelection="single"
  on:cellEditingStarted
  on:cellEditingStopped
  on:cellValueChanged
  on:cellMouseOver
  on:columnMoved
  on:columnPinned
  on:columnResized
  on:columnStateChange
  on:filterChanged
  on:rowClicked
  on:rowDoubleClicked
  on:rowSelected
  on:selectionChanged
/>
