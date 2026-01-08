<svelte:options immutable={true} />

<script lang="ts">
  import { onDestroy } from 'svelte';
  import PageTitle from '../../components/app/PageTitle.svelte';
  import SequenceTemplates from '../../components/sequence-templates/SequenceTemplates.svelte';
  import { SEQUENCE_EXPANSION_MODE, TEMPLATE_EXPANSION_NOT_AVAILABLE_MESSAGE } from '../../constants/command-expansion';
  import { SequencingMode } from '../../enums/sequencing';
  import { resetSequenceTemplateStores } from '../../stores/sequence-template';
  import { getUserStore } from '../../stores/user';

  const user = getUserStore();

  onDestroy(() => {
    resetSequenceTemplateStores();
  });
</script>

<PageTitle title="Sequence Templates" />

{#if SEQUENCE_EXPANSION_MODE === SequencingMode.TYPESCRIPT}
  <span class="st-typography-body">
    {TEMPLATE_EXPANSION_NOT_AVAILABLE_MESSAGE}
  </span>
{:else}
  <SequenceTemplates user={$user} />
{/if}
