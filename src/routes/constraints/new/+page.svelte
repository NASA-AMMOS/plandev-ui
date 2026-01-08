<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import ConstraintForm from '../../../components/constraints/ConstraintForm.svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { tags } from '../../../stores/tags';
  import { getUserStore } from '../../../stores/user';
  import { getSearchParameterNumber } from '../../../utilities/url';

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

<ConstraintForm
  initialReferenceModelId={referenceModelId}
  tags={$tags}
  mode="create"
  user={$user}
  on:selectReferenceModel={onModelSelect}
/>
