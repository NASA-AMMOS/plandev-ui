<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import PageTitle from '../../../../../components/app/PageTitle.svelte';
  import SchedulingGoalForm from '../../../../../components/scheduling/goals/SchedulingGoalForm.svelte';
  import { SearchParameters } from '../../../../../enums/searchParameters';
  import { userStore } from '../../../../../lib/stores/auth';
  import { tags } from '../../../../../stores/tags';
  import { getSearchParameterNumber } from '../../../../../utilities/generic';

  let referenceModelId: number | null = null;

  function onModelSelect(event: CustomEvent<number | null>) {
    const { detail: modelId } = event;
    referenceModelId = modelId;
  }

  onMount(() => {
    if (browser) {
      const modelId = getSearchParameterNumber(SearchParameters.MODEL_ID) ?? null;
      referenceModelId = modelId;
    }
  });
</script>

<PageTitle title="New Scheduling Goal" />

<SchedulingGoalForm
  initialReferenceModelId={referenceModelId}
  tags={$tags}
  mode="create"
  user={$userStore}
  on:selectReferenceModel={onModelSelect}
/>
