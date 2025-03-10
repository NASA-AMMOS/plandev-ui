<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import SequenceTemplates from '../../components/sequence-templates/SequenceTemplates.svelte';
  import { SequencingMode } from '../../enums/sequencing';
  import { sequenceExpansionMode, templatingNotAvailable } from '../../stores/sequencing';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="Sequencing" />

{#if $sequenceExpansionMode === SequencingMode.EXPANSION}
  <span class="st-typography-body">
    {$templatingNotAvailable}
  </span>
{:else}
  <SequenceTemplates user={data.user} />
{/if}
