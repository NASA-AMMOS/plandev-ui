<svelte:options immutable={true} />

<script lang="ts">
  import ExpansionSets from '../../../components/expansion/ExpansionSets.svelte';
  import { SequencingMode } from '../../../enums/sequencing';
  import { sequenceExpansionMode } from '../../../stores/sequencing';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

{#if $sequenceExpansionMode === SequencingMode.TEMPLATING}
  Command Expansion functionality not available in "templating" sequencing mode. Please change the SEQUENCING_MODE
  environment variable in docker-compose.yml.
{:else}
  <ExpansionSets user={data.user} />
{/if}
