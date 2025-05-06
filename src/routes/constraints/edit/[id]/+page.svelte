<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import ConstraintForm from '../../../../components/constraints/ConstraintForm.svelte';
  import { SearchParameters } from '../../../../enums/searchParameters';
  import { constraintMetadata, constraintMetadataId } from '../../../../stores/constraints';
  import { tags } from '../../../../stores/tags';
  import type {
    ConstraintDefinition,
    ConstraintMetadata,
    ConstraintMetadataVersionDefinition,
  } from '../../../../types/constraint';
  import effects from '../../../../utilities/effects';
  import { getSearchParameterNumber, setQueryParam } from '../../../../utilities/url';
  import type { PageData } from './$types';

  export let data: PageData;

  let constraintRevision: number =
    getSearchParameterNumber(SearchParameters.REVISION, $page.url.searchParams) ??
    data.initialConstraint.versions[0].revision;

  let constraintDefinition: Pick<
    ConstraintDefinition,
    'author' | 'definition' | 'revision' | 'tags' | 'type' | 'uploaded_jar_id'
  > = data.initialConstraint.versions.find(
    ({ revision }) => revision === constraintRevision,
  ) as ConstraintMetadataVersionDefinition;
  let constraintDefinitionCode = constraintDefinition?.definition;
  let constraintDefinitionAuthor = constraintDefinition?.author;
  let constraintDefinitionFilename: string | null = null;
  let constraintDefinitionType = constraintDefinition.type;
  let constraintDescription = data.initialConstraint.description;
  let constraintId = data.initialConstraint.id;
  let constraintName = data.initialConstraint.name;
  let constraintPublic = data.initialConstraint.public;
  let constraintDefinitionTags = constraintDefinition.tags.map(({ tag }) => tag);
  let constraintMetadataTags = data.initialConstraint.tags.map(({ tag }) => tag);
  let constraintOwner = data.initialConstraint.owner;
  let constraintRevisions = data.initialConstraint.versions.map(({ revision }) => revision);
  let referenceModelId: number | null = null;

  $: $constraintMetadataId = data.initialConstraint.id;
  $: onConstraintMetadataUpdated($constraintMetadata, $constraintMetadataId);

  async function onConstraintMetadataUpdated(constraintMetadata: ConstraintMetadata | null, constraintId: number) {
    if (constraintMetadata != null && constraintMetadata.id === constraintId) {
      constraintDefinition = constraintMetadata.versions.find(
        ({ revision }) => revision === constraintRevision,
      ) as ConstraintMetadataVersionDefinition;
      if (constraintDefinition != null) {
        constraintDefinitionAuthor = constraintDefinition?.author;
        constraintDefinitionType = constraintDefinition?.type;
        constraintDefinitionCode = constraintDefinition?.definition;
        constraintDefinitionTags = constraintDefinition?.tags.map(({ tag }) => tag);
        if (constraintDefinition.uploaded_jar_id !== null) {
          constraintDefinitionFilename = await effects.getFileName(constraintDefinition.uploaded_jar_id, data.user);
        } else {
          constraintDefinitionFilename = null;
        }
      }

      constraintDescription = constraintMetadata.description;
      constraintId = constraintMetadata.id;
      constraintName = constraintMetadata.name;
      constraintPublic = constraintMetadata.public;
      constraintMetadataTags = constraintMetadata.tags.map(({ tag }) => tag);
      constraintOwner = constraintMetadata.owner;
      constraintRevisions = constraintMetadata.versions.map(({ revision }) => revision);
    }
  }

  function onRevisionSelect(event: CustomEvent<number>) {
    const { detail: revision } = event;
    constraintRevision = revision;
    if (browser) {
      setQueryParam(SearchParameters.REVISION, `${constraintRevision}`);
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

<ConstraintForm
  initialConstraintDefinitionAuthor={constraintDefinitionAuthor}
  initialConstraintDescription={constraintDescription}
  initialConstraintDefinitionType={constraintDefinitionType}
  initialConstraintDefinitionCode={constraintDefinitionCode}
  initialConstraintDefinitionFilename={constraintDefinitionFilename}
  initialConstraintId={constraintId}
  initialConstraintName={constraintName}
  initialConstraintPublic={constraintPublic}
  initialConstraintDefinitionTags={constraintDefinitionTags}
  initialConstraintMetadataTags={constraintMetadataTags}
  initialConstraintOwner={constraintOwner}
  initialConstraintRevision={constraintRevision}
  initialReferenceModelId={referenceModelId}
  {constraintRevisions}
  tags={$tags}
  mode="edit"
  user={data.user}
  on:selectRevision={onRevisionSelect}
  on:selectReferenceModel={onModelSelect}
/>
