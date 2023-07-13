<svelte:options immutable={true} />

<script lang="ts">
  import ConstraintForm from '../../../components/constraints/ConstraintForm.svelte';
  import { tags } from '../../../stores/tags';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<ConstraintForm
  initialModelMap={data.initialModelMap}
  initialModels={data.initialModels}
  initialPlanMap={data.initialPlanMap}
  initialPlans={data.initialPlans}
  initialTags={$tags}
  mode="create"
  user={data.user}
/>
