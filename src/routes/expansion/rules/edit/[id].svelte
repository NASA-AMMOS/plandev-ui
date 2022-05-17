<svelte:options immutable={true} />

<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';
  import req from '../../../../utilities/requests';

  export const load: Load = async ({ params }) => {
    const { id: ruleIdParam } = params;

    if (ruleIdParam !== null && ruleIdParam !== undefined) {
      const ruleIdAsNumber = parseFloat(ruleIdParam);
      const initialRule = await req.getExpansionRule(ruleIdAsNumber);

      if (initialRule !== null) {
        return {
          props: {
            initialRule,
          },
        };
      }
    }

    return {
      redirect: '/expansion/rules',
      status: 302,
    };
  };
</script>

<script lang="ts">
  import ExpansionRuleForm from '../../../../components/expansion/ExpansionRuleForm.svelte';

  export let initialRule: ExpansionRule | null;
</script>

<ExpansionRuleForm
  initialRuleActivityType={initialRule.activity_type}
  initialRuleDictionaryId={initialRule.authoring_command_dict_id}
  initialRuleId={initialRule.id}
  initialRuleLogic={initialRule.expansion_logic}
  initialRuleModelId={initialRule.authoring_mission_model_id}
  mode="edit"
/>
