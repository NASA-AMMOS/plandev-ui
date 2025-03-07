<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import ExpansionRules from '../../../components/expansion/ExpansionRules.svelte';
  import { SequencingMode } from '../../../enums/sequencing';
  import { sequenceExpansionMode } from '../../../stores/sequencing';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="Expansion Rules" />

{#if $sequenceExpansionMode === SequencingMode.TEMPLATING}
  Command Expansion functionality not available in "templating" sequencing mode. Please change the SEQUENCING_MODE
  environment variable in docker-compose.yml.
{:else}
  <ExpansionRules user={data.user} />
{/if}
