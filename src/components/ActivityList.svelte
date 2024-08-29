<svelte:options immutable={true} />

<script lang="ts">
  import { activityTypes } from '../stores/plan';
  import type { ActivityType } from '../types/activity';
  import type { Tag } from '../types/tags';
  import type { TimelineItemType } from '../types/timeline';
  import TimelineItemList from './TimelineItemList.svelte';

  let activitySubsystems: Tag[] = [];

  $: if ($activityTypes) {
    let newActivitySubsystems: Tag[] = [];
    const seenSubsystems: Record<number, boolean> = {};
    $activityTypes.forEach(t => {
      if (t.subsystem_tag && !seenSubsystems[t.subsystem_tag.id]) {
        seenSubsystems[t.subsystem_tag.id] = true;
        newActivitySubsystems.push(t.subsystem_tag);
      }
    });
    activitySubsystems = newActivitySubsystems;
  }

  function getFilterValueFromItem(item: TimelineItemType) {
    return (item as ActivityType).subsystem_tag?.id.toString() ?? '';
  }
</script>

<TimelineItemList
  items={$activityTypes}
  chartType="activity"
  typeName="activity"
  typeNamePlural="Activities"
  {getFilterValueFromItem}
  filterOptions={activitySubsystems.map(s => ({ color: s.color || '', label: s.name, value: s.id.toString() }))}
  filterName="Subsystem"
/>
