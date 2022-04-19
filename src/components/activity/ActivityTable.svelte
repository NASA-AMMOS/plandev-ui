<svelte:options immutable={true} />

<script lang="ts">
  import Table from '../ui/Table.svelte';
  import { activities, activityActions, selectedActivityId } from '../../stores/activities';
</script>

<Table
  columnDefs={[
    { field: 'id', name: 'ID', sortable: true },
    { field: 'type', name: 'Type', sortable: true },
    { field: 'startTime', name: 'Start Time', sortable: true },
    { field: 'duration', name: 'Duration', sortable: true },
  ]}
  rowData={$activities}
  rowSelectionMode="single"
  selectedRowId={$selectedActivityId}
  on:rowClick={({ detail }) => activityActions.selectActivity(detail.id)}
/>
