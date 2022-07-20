<svelte:options immutable={true} />

<script lang="ts" context="module">
  import { base } from '$app/paths';
  import type { Load } from '@sveltejs/kit';
  import ExpansionRuleForm from '../../../../components/expansion/ExpansionRuleForm.svelte';
  import effects from '../../../../utilities/effects';

  export const load: Load = async ({ params }) => {
    const { id: ruleIdParam } = params;

    if (ruleIdParam !== null && ruleIdParam !== undefined) {
      const ruleIdAsNumber = parseFloat(ruleIdParam);
      const initialRule = await effects.getExpansionRule(ruleIdAsNumber);

      if (initialRule !== null) {
        return {
          props: {
            initialRule,
          },
        };
      }
    }

    return {
      redirect: `${base}/expansion/rules`,
      status: 302,
    };
  };
</script>

<script lang="ts">
  export let initialRule: ExpansionRule | null;
</script>

<ExpansionRuleForm
  initialRuleActivityType={initialRule.activity_type}
  initialRuleCreatedAt={initialRule.created_at}
  initialRuleDictionaryId={initialRule.authoring_command_dict_id}
  initialRuleId={initialRule.id}
  initialRuleLogic={initialRule.expansion_logic}
  initialRuleModelId={initialRule.authoring_mission_model_id}
  initialRuleUpdatedAt={initialRule.updated_at}
  mode="edit"
/>
