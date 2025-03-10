<svelte:options immutable={true} />

<script lang="ts">
  import ExpansionRuleForm from '../../../../../components/expansion/ExpansionRuleForm.svelte';
  import { SequencingMode } from '../../../../../enums/sequencing';
  import { commandExpansionNotAvailable, sequenceExpansionMode } from '../../../../../stores/sequencing';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

{#if $sequenceExpansionMode === SequencingMode.TEMPLATING}
  <span class="st-typography-body">
    {$commandExpansionNotAvailable}
  </span>
{:else}
  <ExpansionRuleForm
    initialRuleActivityType={data.initialRule.activity_type}
    initialRuleDescription={data.initialRule.description}
    initialRuleCreatedAt={data.initialRule.created_at}
    initialParcelId={data.initialRule.parcel_id}
    initialRuleId={data.initialRule.id}
    initialRuleLogic={data.initialRule.expansion_logic}
    initialRuleModelId={data.initialRule.authoring_mission_model_id}
    initialRuleName={data.initialRule.name}
    initialRuleOwner={data.initialRule.owner}
    initialRuleTags={data.initialRule.tags.map(({ tag }) => tag)}
    initialRuleUpdatedAt={data.initialRule.updated_at}
    mode="edit"
    user={data.user}
  />
{/if}
