<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../../components/app/PageTitle.svelte';
  import SchedulingConditionForm from '../../../../components/scheduling/conditions/SchedulingConditionForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="New Scheduling Condition" />

<SchedulingConditionForm
  initialConditionModelId={data.initialModelId}
  initialSpecId={data.initialSpecId}
  models={data.models}
  plans={data.plans}
  mode="create"
  user={data.user}
/>
