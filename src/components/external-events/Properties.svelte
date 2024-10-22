<svelte:options immutable={true} />

<script lang="ts">
  import type { ExternalEventProperty } from '../../types/external-event-property';
  import { compare } from '../../utilities/generic';
  import Highlight from '../ui/Highlight.svelte';
  import PropertyBase from './PropertyBase.svelte';
  import PropertyRec from './PropertyRec.svelte';

  export let formProperties: ExternalEventProperty[] = [];
  export let highlightKeysMap: Record<string, boolean> = {};

  let sortedFormProperties: ExternalEventProperty[] = [];

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
