<svelte:options immutable={true} />

<script lang="ts">
  import { activityTypes, subsystemTags } from '../stores/plan';
  import type { ActivityType } from '../types/activity';
  import type { TimelineItemType } from '../types/timeline';
  import TimelineItemList from './TimelineItemList.svelte';

  function getFilterValueFromItem(item: TimelineItemType) {
    return (item as ActivityType).subsystem_tag?.id ?? -1;
  }
</script>

<TimelineItemList
  items={$activityTypes}
  chartType="activity"
  typeName="activity"
  typeNamePlural="Activities"
  {getFilterValueFromItem}
  filterOptions={$subsystemTags.map(s => ({ color: s.color || '', label: s.name, value: s.id }))}
  filterName="Subsystem"
/>
