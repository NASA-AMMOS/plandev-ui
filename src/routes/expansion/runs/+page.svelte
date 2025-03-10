<svelte:options immutable={true} />

<script lang="ts">
  import ExpansionRuns from '../../../components/expansion/ExpansionRuns.svelte';
  import { SequencingMode } from '../../../enums/sequencing';
  import { commandExpansionNotAvailable, sequenceExpansionMode } from '../../../stores/sequencing';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

{#if $sequenceExpansionMode === SequencingMode.TEMPLATING}
  <span class="st-typography-body">
    {$commandExpansionNotAvailable}
  </span>
{:else}
  <ExpansionRuns expansionRuns={data.expansionRuns} user={data.user} />
{/if}
