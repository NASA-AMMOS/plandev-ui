<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import PageTitle from '../../../../../components/app/PageTitle.svelte';
  import SchedulingGoalForm from '../../../../../components/scheduling/goals/SchedulingGoalForm.svelte';
  import { SearchParameters } from '../../../../../enums/searchParameters';
  import { schedulingGoalMetadata, schedulingGoalMetadataId } from '../../../../../stores/scheduling';
  import { tags } from '../../../../../stores/tags';
  import type {
    SchedulingGoalDefinition,
    SchedulingGoalMetadataVersionDefinition,
  } from '../../../../../types/scheduling';
  import { getSearchParameterNumber, setQueryParam } from '../../../../../utilities/generic';
  import type { PageData } from './$types';

  export let data: PageData;

  let goalRevision: number =
    getSearchParameterNumber(SearchParameters.REVISION, $page.url.searchParams) ??
    data.initialGoal.versions[data.initialGoal.versions.length - 1].revision;

  let goalDefinition: Pick<SchedulingGoalDefinition, 'author' | 'definition' | 'revision' | 'tags'> =
    data.initialGoal.versions.find(
      ({ revision }) => revision === goalRevision,
    ) as SchedulingGoalMetadataVersionDefinition;
  let goalDefinitionCode = goalDefinition?.definition;
  let goalDefinitionAuthor = goalDefinition?.author;
  let goalDescription = data.initialGoal.description;
  let goalId = data.initialGoal.id;
  let goalName = data.initialGoal.name;
  let goalPublic = data.initialGoal.public;
  let goalDefinitionTags = goalDefinition.tags.map(({ tag }) => tag);
  let goalMetadataTags = data.initialGoal.tags.map(({ tag }) => tag);
  let goalOwner = data.initialGoal.owner;
  let goalRevisions = data.initialGoal.versions.map(({ revision }) => revision);
  let referenceModelId: number | null = null;

  $: $schedulingGoalMetadataId = data.initialGoal.id;
  $: if ($schedulingGoalMetadata != null && $schedulingGoalMetadata.id === $schedulingGoalMetadataId) {
    goalDefinition = $schedulingGoalMetadata.versions.find(
      ({ revision }) => revision === goalRevision,
    ) as SchedulingGoalMetadataVersionDefinition;
    if (goalDefinition != null) {
      goalDefinitionAuthor = goalDefinition?.author;
      goalDefinitionCode = goalDefinition?.definition;
      goalDefinitionTags = goalDefinition?.tags.map(({ tag }) => tag);
    }

    goalDescription = $schedulingGoalMetadata.description;
    goalId = $schedulingGoalMetadata.id;
    goalName = $schedulingGoalMetadata.name;
    goalPublic = $schedulingGoalMetadata.public;
    goalMetadataTags = $schedulingGoalMetadata.tags.map(({ tag }) => tag);
    goalOwner = $schedulingGoalMetadata.owner;
    goalRevisions = $schedulingGoalMetadata.versions.map(({ revision }) => revision);
  }

  function onRevisionSelect(event: CustomEvent<number>) {
    const { detail: revision } = event;
    goalRevision = revision;
    if (browser) {
      setQueryParam(SearchParameters.REVISION, `${goalRevision}`);
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

<PageTitle subTitle={data.initialGoal.name} title="Scheduling Goals" />

<SchedulingGoalForm
  initialGoalDefinitionAuthor={goalDefinitionAuthor}
  initialGoalDefinitionCode={goalDefinitionCode}
  initialGoalDescription={goalDescription}
  initialGoalId={goalId}
  initialGoalName={goalName}
  initialGoalPublic={goalPublic}
  initialGoalDefinitionTags={goalDefinitionTags}
  initialGoalMetadataTags={goalMetadataTags}
  initialGoalOwner={goalOwner}
  initialGoalRevision={goalRevision}
  initialReferenceModelId={referenceModelId}
  {goalRevisions}
  tags={$tags}
  mode="edit"
  user={data.user}
  on:selectRevision={onRevisionSelect}
  on:selectReferenceModel={onModelSelect}
/>
