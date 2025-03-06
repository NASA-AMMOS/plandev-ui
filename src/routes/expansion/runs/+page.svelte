<svelte:options immutable={true} />

<script lang="ts">
  import ExpansionRuns from '../../../components/expansion/ExpansionRuns.svelte';
  import { SequencingMode } from '../../../enums/sequencing';
  import { sequenceExpansionMode } from '../../../stores/sequencing';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

{#if $sequenceExpansionMode === SequencingMode.TEMPLATING}
  Legacy Sequencing functionality not available in "templating" sequencing mode. Please change the SEQUENCING_MODE
  enviornment variable in docker-compose.yml.
{:else}
  <ExpansionRuns expansionRuns={data.expansionRuns} user={data.user} />
{/if}
