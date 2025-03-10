<svelte:options immutable={true} />

<script lang="ts">
  import ExpansionSetForm from '../../../../components/expansion/ExpansionSetForm.svelte';
  import { SequencingMode } from '../../../../enums/sequencing';
  import { commandExpansionNotAvailable, sequenceExpansionMode } from '../../../../stores/sequencing';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

{#if $sequenceExpansionMode === SequencingMode.TEMPLATING}
  <span class="st-typography-body">
    {$commandExpansionNotAvailable}
  </span>
{:else}
  <ExpansionSetForm mode="create" user={data.user} plans={data.initialPlans} />
{/if}
