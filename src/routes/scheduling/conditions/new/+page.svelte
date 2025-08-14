<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import PageTitle from '../../../../components/app/PageTitle.svelte';
  import SchedulingConditionForm from '../../../../components/scheduling/conditions/SchedulingConditionForm.svelte';
  import { SearchParameters } from '../../../../enums/searchParameters';
  import { tags } from '../../../../stores/tags';
  import { getSearchParameterNumber } from '../../../../utilities/generic';
  import type { PageData } from './$types';

  export let data: PageData;

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

<PageTitle title="New Scheduling Condition" />

<SchedulingConditionForm
  initialReferenceModelId={referenceModelId}
  tags={$tags}
  mode="create"
  user={data.user}
  on:selectReferenceModel={onModelSelect}
/>
