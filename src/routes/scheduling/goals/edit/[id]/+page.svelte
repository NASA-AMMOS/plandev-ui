<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../../../components/app/PageTitle.svelte';
  import SchedulingGoalForm from '../../../../../components/scheduling/SchedulingGoalForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle subTitle={data.initialGoal.name} title="Scheduling Goals" />

<SchedulingGoalForm
  initialGoalAuthor={data.initialGoal.author}
  initialGoalCreatedDate={data.initialGoal.created_date}
  initialGoalDefinition={data.initialGoal.definition}
  initialGoalDescription={data.initialGoal.description}
  initialGoalId={data.initialGoal.id}
  initialGoalName={data.initialGoal.name}
  initialGoalModelId={data.initialGoal.model_id}
  initialGoalModifiedDate={data.initialGoal.modified_date}
  initialModels={data.initialModels}
  mode="edit"
/>
