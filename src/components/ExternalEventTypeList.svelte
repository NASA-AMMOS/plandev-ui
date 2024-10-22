<svelte:options immutable={true} />

<script lang="ts">
  import { externalEventTypes } from '../stores/external-event';
  import type { TimelineItemType } from '../types/timeline';
  import TimelineItemList from './TimelineItemList.svelte';

  function getFilterValueFromItem(item: TimelineItemType) {
    return item.name;
  }
</script>

<TimelineItemList
  items={$externalEventTypes}
  chartType="externalEvent"
  typeName="externalEvent"
  typeNamePlural="External Events"
  filterOptions={$externalEventTypes.map(t => ({ label: t.name, value: t.name }))}
  filterName="Event Type"
  {getFilterValueFromItem}
/>
