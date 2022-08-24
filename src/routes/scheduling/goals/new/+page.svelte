<svelte:options immutable={true} />

<script lang="ts">
  import SchedulingGoalForm from '../../../../components/scheduling/SchedulingGoalForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<SchedulingGoalForm initialModels={data.initialModels} initialSpecId={data.initialSpecId} mode="create" />
