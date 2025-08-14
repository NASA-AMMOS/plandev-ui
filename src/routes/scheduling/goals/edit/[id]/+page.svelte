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
  import effects from '../../../../../utilities/effects';
  import { getSearchParameterNumber, setQueryParam } from '../../../../../utilities/generic';
  import type { PageData } from './$types';

  export let data: PageData;

  let goalRevision: number =
    getSearchParameterNumber(SearchParameters.REVISION, $page.url.searchParams) ??
    data.initialGoal.versions[0].revision;

  let goalDefinition: Pick<
    SchedulingGoalDefinition,
    'author' | 'definition' | 'revision' | 'tags' | 'type' | 'uploaded_jar_id'
  > = data.initialGoal.versions.find(
    ({ revision }) => revision === goalRevision,
  ) as SchedulingGoalMetadataVersionDefinition;
  let goalDefinitionCode = goalDefinition?.definition ?? null;
  let goalDefinitionAuthor = goalDefinition?.author;
  let goalDefinitionFilename: string | null = null;
  let goalDefinitionType = goalDefinition.type;
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
  $: (async () => {
    if ($schedulingGoalMetadata != null && $schedulingGoalMetadata.id === $schedulingGoalMetadataId) {
      goalDefinition = $schedulingGoalMetadata.versions.find(
        ({ revision }) => revision === goalRevision,
      ) as SchedulingGoalMetadataVersionDefinition;
      if (goalDefinition != null) {
        goalDefinitionAuthor = goalDefinition?.author;
        goalDefinitionType = goalDefinition?.type;
        goalDefinitionCode = goalDefinition?.definition;
        goalDefinitionTags = goalDefinition?.tags.map(({ tag }) => tag);
        if (goalDefinition.uploaded_jar_id !== null) {
          goalDefinitionFilename = await effects.getFileName(goalDefinition.uploaded_jar_id, data.user);
        } else {
          goalDefinitionFilename = null;
        }
      }

      goalDescription = $schedulingGoalMetadata.description;
      goalId = $schedulingGoalMetadata.id;
      goalName = $schedulingGoalMetadata.name;
      goalPublic = $schedulingGoalMetadata.public;
      goalMetadataTags = $schedulingGoalMetadata.tags.map(({ tag }) => tag);
      goalOwner = $schedulingGoalMetadata.owner;
      goalRevisions = $schedulingGoalMetadata.versions.map(({ revision }) => revision);
    }
  })();

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
  initialGoalDescription={goalDescription}
  initialGoalDefinitionType={goalDefinitionType}
  initialGoalDefinitionCode={goalDefinitionCode}
  initialGoalDefinitionFilename={goalDefinitionFilename}
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
