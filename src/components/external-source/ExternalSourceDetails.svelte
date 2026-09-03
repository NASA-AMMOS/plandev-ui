<script lang="ts">
  import { plugins } from '../../stores/plugins';
  import type { User } from '../../types/app';
  import type { ExternalSourceSlim } from '../../types/external-source';
  import effects from '../../utilities/effects';
  import { formatDate } from '../../utilities/time';
  import Collapse from '../Collapse.svelte';

  export let source: ExternalSourceSlim;
  export let user: User | null = null;

  let sourceEvents: number = 0;

  $: effects.getExternalSourceEventCount(source, user).then(eventCount => (sourceEvents = eventCount));
</script>

<Collapse title={source.key} tooltipContent={source.key} defaultExpanded={false}>
  <svelte:fragment slot="right">
    <p class="st-typography-body derived-event-count">
      {sourceEvents} events
    </p>
  </svelte:fragment>
  <div class="st-typography-body">
    <div class="st-typography-bold">Key:</div>
    {source.key}
  </div>

  <div class="st-typography-body">
    <div class="st-typography-bold">Source Type:</div>
    {source.source_type_name}
  </div>

  <div class="st-typography-body">
    <div class="st-typography-bold">Start Time:</div>
    {formatDate(new Date(source.start_time), $plugins.time.primary.format)}
  </div>

  <div class="st-typography-body">
    <div class="st-typography-bold">End Time:</div>
    {formatDate(new Date(source.end_time), $plugins.time.primary.format)}
  </div>

  <div class="st-typography-body">
    <div class="st-typography-bold">Valid At:</div>
    {formatDate(new Date(source.valid_at), $plugins.time.primary.format)}
  </div>

  <div class="st-typography-body">
    <div class="st-typography-bold">Created At:</div>
    {formatDate(new Date(source.created_at), $plugins.time.primary.format)}
  </div>
</Collapse>
