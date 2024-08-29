<svelte:options immutable={true} />

<script lang="ts">
  import type { ResourceType } from '../types/simulation';
  import type { TimelineItemType } from '../types/timeline';

  export let item: TimelineItemType | undefined = undefined;

  let prefix: string = '';
  let units: string | undefined = undefined;
  let type: string = 'Unk';

  $: units = (item as ResourceType)?.schema.metadata?.unit?.value;
  $: type = (item as ResourceType)?.schema.type ?? 'Unk';
  $: if (type) {
    prefix = `(${type}${units ? ` • ${units}` : ''})`;
  }
</script>

<i class="resource-list-prefix st-typography-body" style:margin-left={units || type ? '4px' : '0'}>
  {prefix}
</i>

<style>
  .resource-list-prefix {
    color: var(--st-gray-50);
  }
</style>
