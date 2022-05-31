<svelte:options immutable={true} />

<script lang="ts">
  import { activities, selectedActivityId } from '../../stores/activities';
  import { view } from '../../stores/views';
  import Table from '../ui/Table.svelte';

  export let activityTableId: number;

  let activityTable: ViewActivityTable;

  $: activityTable = $view?.plan.activityTables.find(table => table.id === activityTableId);
</script>

<Table
  columnDefs={activityTable?.columnDefs}
  rowData={$activities}
  rowSelectionMode="single"
  selectedRowId={$selectedActivityId}
  on:rowClick={({ detail }) => ($selectedActivityId = detail.id)}
/>
