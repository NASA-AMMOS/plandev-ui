<svelte:options immutable={true} />

<script lang="ts">
  import { resourceTypes } from '../stores/simulation';
  import type { ResourceType } from '../types/simulation';
  import type { TimelineItemType } from '../types/timeline';
  import ResourceListPrefix from './ResourceListPrefix.svelte';
  import TimelineItemList from './TimelineItemList.svelte';

  let resourceDataTypes: string[] = [];

  $: resourceDataTypes = [...new Set($resourceTypes.map(t => t.schema.type))];

  function getFilterValueFromItem(item: TimelineItemType) {
    return (item as ResourceType).schema.type;
  }
</script>

<TimelineItemList
  items={$resourceTypes}
  chartType="line"
  typeName="resource"
  typeNamePlural="Resources"
  filterOptions={resourceDataTypes.map(t => ({ label: t, value: t }))}
  filterName="Data Type"
  {getFilterValueFromItem}
  let:prop={item}
>
  <ResourceListPrefix {item} />
</TimelineItemList>
