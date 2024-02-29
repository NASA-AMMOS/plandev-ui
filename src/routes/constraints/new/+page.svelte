<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import ConstraintForm from '../../../components/constraints/ConstraintForm.svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { tags } from '../../../stores/tags';
  import { getSearchParameterNumber } from '../../../utilities/generic';
  import type { PageData } from './$types';

  export let data: PageData;

  let referenceModelId: number | null = null;

  onMount(() => {
    if (browser) {
      const modelId = getSearchParameterNumber(SearchParameters.MODEL_ID) ?? null;
      referenceModelId = modelId;
    }
  });
</script>

<ConstraintForm initialReferenceModelId={referenceModelId} tags={$tags} mode="create" user={data.user} />
