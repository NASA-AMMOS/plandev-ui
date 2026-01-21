<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import ExpansionRules from '../../../components/expansion/ExpansionRules.svelte';
  import {
    SEQUENCE_EXPANSION_MODE,
    TYPESCRIPT_EXPANSION_NOT_AVAILABLE_MESSAGE,
  } from '../../../constants/command-expansion';
  import { SequencingMode } from '../../../enums/sequencing';
  import { getUserStore } from '../../../stores/user';

  const user = getUserStore();
</script>

<PageTitle title="Expansion Rules" />

{#if SEQUENCE_EXPANSION_MODE === SequencingMode.TEMPLATING}
  <span class="st-typography-body">
    {TYPESCRIPT_EXPANSION_NOT_AVAILABLE_MESSAGE}
  </span>
{:else}
  <ExpansionRules user={$user} />
{/if}
