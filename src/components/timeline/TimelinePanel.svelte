<svelte:options immutable={true} />

<script lang="ts">
  import GridMenu from '../menus/GridMenu.svelte';
  import Panel from '../ui/Panel.svelte';
  import Timeline from './Timeline.svelte';

  export let gridId: number;
  export let timelineId: number;
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Timeline" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <Timeline {timelineId} />
  </svelte:fragment>
</Panel>
