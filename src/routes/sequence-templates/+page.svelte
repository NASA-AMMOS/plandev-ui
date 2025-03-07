<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import SequenceTemplates from '../../components/sequence-templates/SequenceTemplates.svelte';
  import { SequencingMode } from '../../enums/sequencing';
  import { sequenceExpansionMode } from '../../stores/sequencing';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="Sequencing" />

{#if $sequenceExpansionMode === SequencingMode.EXPANSION}
  Sequence Templating functionality not available in Command Expansion mode. Please change the SEQUENCING_MODE
  environment variable in docker-compose.yml.
{:else}
  <SequenceTemplates user={data.user} />
{/if}
