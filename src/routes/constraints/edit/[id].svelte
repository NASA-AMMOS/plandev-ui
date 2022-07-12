<svelte:options immutable={true} />

<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';
  import ConstraintForm from '../../../components/constraint/ConstraintForm.svelte';
  import effects from '../../../utilities/effects';
  import { parseFloatOrNull } from '../../../utilities/generic';

  export const load: Load = async ({ params }) => {
    const { id: constraintIdParam } = params;

    if (constraintIdParam !== null && constraintIdParam !== undefined) {
      const constraintId = parseFloatOrNull(constraintIdParam);
      const initialConstraint = await effects.getConstraint(constraintId);
      const { models: initialModels, plans: initialPlans } = await effects.getPlansAndModels();

      if (initialConstraint !== null) {
        return {
          props: {
            initialConstraint,
            initialModels,
            initialPlans,
          },
        };
      }
    }

    return {
      redirect: '/constraints',
      status: 302,
    };
  };
</script>

<script lang="ts">
  export let initialConstraint: Constraint;
  export let initialModels: ModelList[] = [];
  export let initialPlans: PlanList[] = [];
</script>

<ConstraintForm
  initialConstraintDefinition={initialConstraint.definition}
  initialConstraintDescription={initialConstraint.description}
  initialConstraintId={initialConstraint.id}
  initialConstraintModelId={initialConstraint.model_id}
  initialConstraintName={initialConstraint.name}
  initialConstraintPlanId={initialConstraint.plan_id}
  initialConstraintSummary={initialConstraint.summary}
  {initialModels}
  {initialPlans}
  mode="edit"
/>
