<svelte:options immutable={true} />

<script lang="ts">
  import { activities, selectedActivityId, selectedActivityIds } from '../../stores/activities';
  import { view } from '../../stores/views';
  import DataGrid from '../ui/DataGrid.svelte';

  export let activityTableId: number;

  let activityTable: ViewActivityTable;

  $: activityTable = $view?.definition.plan.activityTables.find(table => table.id === activityTableId);

  function onRowSelected({
    detail: {
      data: { id },
      isSelected,
    },
  }) {
    if (isSelected) {
      $selectedActivityId = id;
    }
  }
</script>

<DataGrid
  columnDefs={Object.keys(activityTable?.columnDefs).map(columnKey => {
    const columnDef = activityTable?.columnDefs[columnKey];
    return {
      field: columnDef.field,
      filter: 'agTextColumnFilter',
      floatingFilter: true,
      headerName: columnDef.name,
      resizable: true,
      sortable: columnDef.sortable,
    };
  })}
  rowSelection="single"
  rowData={$activities}
  selectedRowIds={$selectedActivityIds}
  on:rowSelected={onRowSelected}
/>
