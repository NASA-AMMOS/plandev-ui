<svelte:options immutable={true} />

<script lang="ts">
  import ConstraintForm from '../../../components/constraints/ConstraintForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<ConstraintForm
  initialModelMap={data.initialModelMap}
  initialModels={data.initialModels}
  initialPlanMap={data.initialPlanMap}
  initialPlans={data.initialPlans}
  mode="create"
  user={data.user}
/>
