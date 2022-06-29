<svelte:options immutable={true} />

<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';
  import SchedulingGoalForm from '../../../../components/scheduling/SchedulingGoalForm.svelte';
  import effects from '../../../../utilities/effects';
  import { parseFloatOrNull } from '../../../../utilities/generic';

  export const load: Load = async ({ params }) => {
    const { id: goalIdParam } = params;

    if (goalIdParam !== null && goalIdParam !== undefined) {
      const goalId = parseFloatOrNull(goalIdParam);
      const initialGoal = await effects.getSchedulingGoal(goalId);
      const initialModels = await effects.getModels();

      if (initialGoal !== null) {
        return {
          props: {
            initialGoal,
            initialModels,
          },
        };
      }
    }

    return {
      redirect: '/scheduling/goals',
      status: 302,
    };
  };
</script>

<script lang="ts">
  export let initialGoal: SchedulingGoal;
  export let initialModels: ModelList[] = [];
</script>

<SchedulingGoalForm
  initialGoalAuthor={initialGoal.author}
  initialGoalCreatedDate={initialGoal.created_date}
  initialGoalDefinition={initialGoal.definition}
  initialGoalDescription={initialGoal.description}
  initialGoalId={initialGoal.id}
  initialGoalName={initialGoal.name}
  initialGoalModelId={initialGoal.model_id}
  initialGoalModifiedDate={initialGoal.modified_date}
  {initialModels}
  mode="edit"
/>
