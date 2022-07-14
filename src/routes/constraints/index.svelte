<svelte:options immutable={true} />

<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';
  import Constraints from '../../components/constraints/Constraints.svelte';
  import effects from '../../utilities/effects';

  export const load: Load = async () => {
    const { plans: initialPlans } = await effects.getPlansAndModels();

    return {
      props: {
        initialPlans,
      },
    };
  };
</script>

<script lang="ts">
  export let initialPlans: PlanList[] = [];
</script>

<Constraints {initialPlans} />
