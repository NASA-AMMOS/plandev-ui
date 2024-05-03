<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import PageTitle from '../../../../../components/app/PageTitle.svelte';
  import SchedulingConditionForm from '../../../../../components/scheduling/conditions/SchedulingConditionForm.svelte';
  import { SearchParameters } from '../../../../../enums/searchParameters';
  import { schedulingConditionMetadata, schedulingConditionMetadataId } from '../../../../../stores/scheduling';
  import { tags } from '../../../../../stores/tags';
  import type {
    SchedulingConditionDefinition,
    SchedulingConditionMetadataVersionDefinition,
  } from '../../../../../types/scheduling';
  import { getSearchParameterNumber, setQueryParam } from '../../../../../utilities/generic';
  import type { PageData } from './$types';

  export let data: PageData;

  let conditionRevision: number =
    getSearchParameterNumber(SearchParameters.REVISION, $page.url.searchParams) ??
    data.initialCondition.versions[0].revision;

  let conditionDefinition: Pick<SchedulingConditionDefinition, 'author' | 'definition' | 'revision' | 'tags'> =
    data.initialCondition.versions.find(
      ({ revision }) => revision === conditionRevision,
    ) as SchedulingConditionMetadataVersionDefinition;
  let conditionDefinitionCode = conditionDefinition?.definition;
  let conditionDefinitionAuthor = conditionDefinition?.author;
  let conditionDescription = data.initialCondition.description;
  let conditionId = data.initialCondition.id;
  let conditionName = data.initialCondition.name;
  let conditionPublic = data.initialCondition.public;
  let conditionDefinitionTags = conditionDefinition.tags.map(({ tag }) => tag);
  let conditionMetadataTags = data.initialCondition.tags.map(({ tag }) => tag);
  let conditionOwner = data.initialCondition.owner;
  let conditionRevisions = data.initialCondition.versions.map(({ revision }) => revision);
  let referenceModelId: number | null = null;

  $: $schedulingConditionMetadataId = data.initialCondition.id;
  $: if ($schedulingConditionMetadata != null && $schedulingConditionMetadata.id === $schedulingConditionMetadataId) {
    conditionDefinition = $schedulingConditionMetadata.versions.find(
      ({ revision }) => revision === conditionRevision,
    ) as SchedulingConditionMetadataVersionDefinition;
    if (conditionDefinition != null) {
      conditionDefinitionAuthor = conditionDefinition?.author;
      conditionDefinitionCode = conditionDefinition?.definition;
      conditionDefinitionTags = conditionDefinition?.tags.map(({ tag }) => tag);
    }

    conditionDescription = $schedulingConditionMetadata.description;
    conditionId = $schedulingConditionMetadata.id;
    conditionName = $schedulingConditionMetadata.name;
    conditionPublic = $schedulingConditionMetadata.public;
    conditionMetadataTags = $schedulingConditionMetadata.tags.map(({ tag }) => tag);
    conditionOwner = $schedulingConditionMetadata.owner;
    conditionRevisions = $schedulingConditionMetadata.versions.map(({ revision }) => revision);
  }

  function onRevisionSelect(event: CustomEvent<number>) {
    const { detail: revision } = event;
    conditionRevision = revision;
    if (browser) {
      setQueryParam(SearchParameters.REVISION, `${conditionRevision}`);
    }
  }

  function onModelSelect(event: CustomEvent<number | null>) {
    const { detail: modelId } = event;
    if (browser) {
      setQueryParam(SearchParameters.MODEL_ID, modelId != null ? `${modelId}` : null);
    }
  }

  onMount(() => {
    if (browser) {
      const modelId = getSearchParameterNumber(SearchParameters.MODEL_ID) ?? null;
      referenceModelId = modelId;
    }
  });
</script>

<PageTitle subTitle={data.initialCondition.name} title="Scheduling Conditions" />

<SchedulingConditionForm
  initialConditionDefinitionAuthor={conditionDefinitionAuthor}
  initialConditionDefinitionCode={conditionDefinitionCode}
  initialConditionDescription={conditionDescription}
  initialConditionId={conditionId}
  initialConditionName={conditionName}
  initialConditionPublic={conditionPublic}
  initialConditionDefinitionTags={conditionDefinitionTags}
  initialConditionMetadataTags={conditionMetadataTags}
  initialConditionOwner={conditionOwner}
  initialConditionRevision={conditionRevision}
  initialReferenceModelId={referenceModelId}
  {conditionRevisions}
  tags={$tags}
  mode="edit"
  user={data.user}
  on:selectRevision={onRevisionSelect}
  on:selectReferenceModel={onModelSelect}
/>
