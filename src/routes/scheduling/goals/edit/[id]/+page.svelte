<svelte:options immutable={true} />

<script lang="ts">
  import SchedulingGoalForm from '../../../../../components/scheduling/SchedulingGoalForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

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
