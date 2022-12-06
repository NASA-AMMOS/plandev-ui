<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../../components/app/PageTitle.svelte';
  import SchedulingGoalForm from '../../../../components/scheduling/SchedulingGoalForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="New Scheduling Goal" />

<SchedulingGoalForm
  initialGoalModelId={data.initialModelId}
  initialModels={data.initialModels}
  initialSpecId={data.initialSpecId}
  mode="create"
/>
