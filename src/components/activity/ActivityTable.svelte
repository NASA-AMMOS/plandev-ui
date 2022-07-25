<svelte:options immutable={true} />

<script lang="ts">
  import { activities, selectedActivityId, selectedActivityIds } from '../../stores/activities';
  import { view } from '../../stores/views';
  import DataGrid from '../ui/DataGrid.svelte';

  export let activityTableId: number;

  let activityTable: ViewActivityTable;

  $: activityTable = $view?.definition.plan.activityTables.find(table => table.id === activityTableId);
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
  selectedRowIds={$selectedActivityIds}
  rowSelection="single"
  rowData={$activities}
  on:rowSelected={({ detail }) => ($selectedActivityId = detail.data.id)}
/>
