<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import ExpansionRules from '../../../components/expansion/ExpansionRules.svelte';
  import { SequencingMode } from '../../../enums/sequencing';
  import { commandExpansionNotAvailable, sequenceExpansionMode } from '../../../stores/sequencing';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="Expansion Rules" />

{#if $sequenceExpansionMode === SequencingMode.TEMPLATING}
  <span class="st-typography-body">
    {$commandExpansionNotAvailable}
  </span>
{:else}
  <ExpansionRules user={data.user} />
{/if}
