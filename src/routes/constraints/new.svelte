<svelte:options immutable={true} />

<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';
  import ConstraintForm from '../../components/constraints/ConstraintForm.svelte';
  import effects from '../../utilities/effects';

  export const load: Load = async () => {
    const { models: initialModels, plans: initialPlans } = await effects.getPlansAndModels();

    return {
      props: {
        initialModels,
        initialPlans,
      },
    };
  };
</script>

<script lang="ts">
  export let initialModels: ModelList[] = [];
  export let initialPlans: PlanList[] = [];
</script>

<ConstraintForm {initialModels} {initialPlans} mode="create" />
