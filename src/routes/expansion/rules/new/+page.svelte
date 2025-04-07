<svelte:options immutable={true} />

<script lang="ts">
  import ExpansionRuleForm from '../../../../components/expansion/ExpansionRuleForm.svelte';
  import {
    SEQUENCE_EXPANSION_MODE,
    TYPESCRIPT_EXPANSION_NOT_AVAILABLE_MESSAGE,
  } from '../../../../constants/command-expansion';
  import { SequencingMode } from '../../../../enums/sequencing';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

{#if SEQUENCE_EXPANSION_MODE === SequencingMode.TEMPLATING}
  <span class="st-typography-body">
    {TYPESCRIPT_EXPANSION_NOT_AVAILABLE_MESSAGE}
  </span>
{:else}
  <ExpansionRuleForm mode="create" user={data.user} />
{/if}
