<svelte:options immutable={true} />

<script lang="ts">
  import type { ExternalEventMetadata } from '../../types/external-event-metadata';
  import { compare } from '../../utilities/generic';
  import Highlight from '../ui/Highlight.svelte';
  import PropertyBase from './PropertyBase.svelte';
  import PropertyRec from './PropertyRec.svelte';

  export let formProperties: ExternalEventMetadata[] = [];
  export let highlightKeysMap: Record<string, boolean> = {};

  let sortedFormProperties: ExternalEventMetadata[] = [];

  $: sortedFormProperties = formProperties.sort((a, b) => compare(a.name, b.name));
</script>

<div>
  {#each sortedFormProperties as formProperty (formProperty.name)}
    <Highlight highlight={highlightKeysMap[formProperty.name]}>
      {#if typeof formProperty.value === 'object'}
        <PropertyRec {formProperty} {highlightKeysMap} />
      {:else}
        <PropertyBase {formProperty} {highlightKeysMap} />
      {/if}
    </Highlight>
  {/each}
</div>
