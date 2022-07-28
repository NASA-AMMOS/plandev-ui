<svelte:options immutable={true} />

<script lang="ts">
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import ActivityTable from './ActivityTable.svelte';

  export let activityTableId: number;
  export let gridId: number;
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Activity Table" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <ActivityTable {activityTableId} />
  </svelte:fragment>
</Panel>
