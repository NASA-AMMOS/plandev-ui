<svelte:options immutable={true} />

<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit';
  import SchedulingGoalForm from '../../../components/scheduling/SchedulingGoalForm.svelte';
  import effects from '../../../utilities/effects';
  import { parseFloatOrNull } from '../../../utilities/generic';

  export const load: Load = async ({ url }) => {
    const specId: string | null = url.searchParams.get('specId');
    const initialSpecId: number | null = parseFloatOrNull(specId);
    const initialModels = await effects.getModels();

    return {
      props: {
        initialModels,
        initialSpecId,
      },
    };
  };
</script>

<script lang="ts">
  export let initialModels: ModelList[] = [];
  export let initialSpecId: number | null;
</script>

<SchedulingGoalForm {initialModels} {initialSpecId} mode="create" />
