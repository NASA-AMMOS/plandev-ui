<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../../../components/app/PageTitle.svelte';
  import SchedulingConditionForm from '../../../../../components/scheduling/conditions/SchedulingConditionForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle subTitle={data.initialCondition.name} title="Scheduling Conditions" />

<SchedulingConditionForm
  initialConditionAuthor={data.initialCondition.author}
  initialConditionCreatedDate={data.initialCondition.created_date}
  initialConditionDefinition={data.initialCondition.definition}
  initialConditionDescription={data.initialCondition.description}
  initialConditionId={data.initialCondition.id}
  initialConditionName={data.initialCondition.name}
  initialConditionModelId={data.initialCondition.model_id}
  initialConditionModifiedDate={data.initialCondition.modified_date}
  initialModels={data.initialModels}
  mode="edit"
/>
