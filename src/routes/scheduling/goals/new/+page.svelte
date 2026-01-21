<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import PageTitle from '../../../../components/app/PageTitle.svelte';
  import SchedulingGoalForm from '../../../../components/scheduling/goals/SchedulingGoalForm.svelte';
  import { SearchParameters } from '../../../../enums/searchParameters';
  import { tags } from '../../../../stores/tags';
  import { getUserStore } from '../../../../stores/user';
  import { getSearchParameterNumber } from '../../../../utilities/url';

  const user = getUserStore();

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
  user={$user}
  on:selectReferenceModel={onModelSelect}
/>
