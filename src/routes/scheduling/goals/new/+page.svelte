<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../../components/app/PageTitle.svelte';
  import SchedulingGoalForm from '../../../../components/scheduling/goals/SchedulingGoalForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="New Scheduling Goal" />

<SchedulingGoalForm
  initialGoalModelId={data.initialModelId}
  initialSpecId={data.initialSpecId}
  mode="create"
  models={data.models}
  plans={data.plans}
/>
