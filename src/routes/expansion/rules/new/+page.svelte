<svelte:options immutable={true} />

<script lang="ts">
  import ExpansionRuleForm from '../../../../components/expansion/ExpansionRuleForm.svelte';
  import { SequencingMode } from '../../../../enums/sequencing';
  import { sequenceExpansionMode } from '../../../../stores/sequencing';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

{#if $sequenceExpansionMode === SequencingMode.TEMPLATING}
  Command Expansion functionality not available in "templating" sequencing mode. Please change the SEQUENCING_MODE
  environment variable in docker-compose.yml.
{:else}
  <ExpansionRuleForm mode="create" user={data.user} />
{/if}
