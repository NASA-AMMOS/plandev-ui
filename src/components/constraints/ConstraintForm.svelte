<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { createEventDispatcher } from 'svelte';
  import { SearchParameters } from '../../enums/searchParameters';
  import { constraints } from '../../stores/constraints';
  import type { User, UserId } from '../../types/app';
  import type { TypeScriptFile } from '../../types/monaco';
  import type { ConstraintDefinitionTagsInsertInput, ConstraintMetadataTagsInsertInput, Tag } from '../../types/tags';
  import effects from '../../utilities/effects';
  import { featurePermissions } from '../../utilities/permissions';
  import PageTitle from '../app/PageTitle.svelte';
  import AssociationForm from '../ui/Association/AssociationForm.svelte';

  export let initialConstraintDefinitionAuthor: UserId | undefined = undefined;
  export let initialConstraintDefinitionCode: string = 'export default (): Constraint => {\n\n}\n';
  export let initialConstraintDescription: string = '';
  export let initialConstraintId: number | null = null;
  export let initialConstraintName: string = '';
  export let initialConstraintPublic: boolean = true;
  export let initialConstraintDefinitionTags: Tag[] = [];
  export let initialConstraintMetadataTags: Tag[] = [];
  export let initialConstraintOwner: UserId = null;
  export let initialConstraintRevision: number | null = null;
  export let initialReferenceModelId: number | null = null;
  export let constraintRevisions: number[] = [];
  export let tags: Tag[] = [];
  export let mode: 'create' | 'edit' = 'create';
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    selectReferenceModel: number | null;
    selectRevision: number;
  }>();

  const permissionError = `You do not have permission to ${mode === 'edit' ? 'edit this' : 'create a'} constraint.`;

  let hasCreateDefinitionCodePermission: boolean = false;
  let hasWriteDefinitionTagsPermission: boolean = false;
  let hasWriteMetadataPermission: boolean = false;
  let pageTitle = mode === 'edit' ? 'Constraints' : 'New Constraint';
  let pageSubtitle = mode === 'edit' ? initialConstraintName : '';
  let constraintsTsFiles: TypeScriptFile[] = [];

  $: hasCreateDefinitionCodePermission = featurePermissions.constraints.canCreate(user);
  $: if (user) {
    hasWriteDefinitionTagsPermission = featurePermissions.constraints.canUpdateDefinition(user, {
      author: mode === 'create' ? user.id : initialConstraintDefinitionAuthor ?? user.id,
    });
  }
  $: hasWriteMetadataPermission =
    mode === 'create'
      ? featurePermissions.constraints.canCreate(user)
      : featurePermissions.constraints.canUpdate(user, { owner: initialConstraintOwner });
  $: pageTitle = mode === 'edit' ? 'Constraints' : 'New Constraint';
  $: pageSubtitle = mode === 'edit' ? initialConstraintName : '';
  $: selectReferenceModel(initialReferenceModelId);

  function selectReferenceModel(modelId: number | null) {
    if (modelId !== null) {
      effects.getTsFilesScheduling(modelId, user).then(tsFiles => (constraintsTsFiles = tsFiles));
    } else {
      constraintsTsFiles = [];
    }
  }

  function selectRevision(revision: number | string) {
    dispatch('selectRevision', parseInt(`${revision}`));
  }

  function onRevisionSelection(event: CustomEvent<number>) {
    const { detail } = event;

    selectRevision(`${detail}`);
  }

  function onSelectReferenceModel(event: CustomEvent<number | null>) {
    const { detail: modelId } = event;
    selectReferenceModel(modelId);
    dispatch('selectReferenceModel', modelId);
  }

  function onClose() {
    goto(`${base}/constraints`);
  }

  async function onCreateConstraint(
    event: CustomEvent<{
      definition: {
        code: string;
        tags: Tag[];
      };
      description: string;
      name: string;
      public: boolean;
      tags: Tag[];
    }>,
  ) {
    const {
      detail: { definition, description, name, public: isPublic, tags },
    } = event;
    const newConstraintId = await effects.createConstraint(
      name,
      isPublic,
      tags.map(({ id }) => ({ tag_id: id })),
      definition.code,
      definition.tags.map(({ id }) => ({ tag_id: id })),
      user,
      description,
    );

    if (newConstraintId !== null) {
      goto(
        `${base}/constraints/edit/${newConstraintId}${
          initialReferenceModelId !== null ? `?${SearchParameters.MODEL_ID}=${initialReferenceModelId}` : ''
        }`,
      );
    }
  }

  async function onCreateNewConstraintDefinition(
    event: CustomEvent<{
      definitionCode: string;
      definitionTags: Tag[];
    }>,
  ) {
    const {
      detail: { definitionCode, definitionTags },
    } = event;
    if (initialConstraintId !== null) {
      const definition = await effects.createConstraintDefinition(
        initialConstraintId,
        definitionCode,
        definitionTags.map(({ id }) => ({ tag_id: id })),
        user,
      );

      if (definition !== null) {
        selectRevision(definition.revision);
      }
    }
  }

  async function onSaveConstraintMetadata(
    event: CustomEvent<{
      metadata: {
        description: string;
        name: string;
        owner: UserId;
        public: boolean;
      };
      tagIdsToDelete: number[];
      tagsToUpdate: Tag[];
    }>,
  ) {
    if (initialConstraintId !== null) {
      const {
        detail: {
          metadata: { description, name, owner, public: isPublic },
          tagIdsToDelete,
          tagsToUpdate,
        },
      } = event;
      const constraintMetadataTagsToUpdate: ConstraintMetadataTagsInsertInput[] = tagsToUpdate.map(
        ({ id: tag_id }) => ({
          constraint_id: initialConstraintId as number,
          tag_id,
        }),
      );

      await effects.updateConstraintMetadata(
        initialConstraintId,
        {
          description,
          name,
          owner,
          public: isPublic,
        },
        constraintMetadataTagsToUpdate,
        tagIdsToDelete,
        initialConstraintOwner,
        user,
      );
    }
  }

  async function onSaveConstraintDefinitionRevisionTags(
    event: CustomEvent<{
      tagIdsToDelete: number[];
      tagsToUpdate: Tag[];
    }>,
  ) {
    if (
      initialConstraintId !== null &&
      initialConstraintRevision !== null &&
      initialConstraintDefinitionAuthor !== undefined
    ) {
      const {
        detail: { tagIdsToDelete, tagsToUpdate },
      } = event;
      // Associate new tags with constraint definition version
      const constraintDefinitionTagsToUpdate: ConstraintDefinitionTagsInsertInput[] = tagsToUpdate.map(
        ({ id: tag_id }) => ({
          constraint_id: initialConstraintId as number,
          constraint_revision: initialConstraintRevision as number,
          tag_id,
        }),
      );
      await effects.updateConstraintDefinitionTags(
        initialConstraintId,
        initialConstraintRevision,
        initialConstraintDefinitionAuthor,
        constraintDefinitionTagsToUpdate,
        tagIdsToDelete,
        user,
      );
    }
  }
</script>

<PageTitle subTitle={pageSubtitle} title={pageTitle} />

<AssociationForm
  allMetadata={$constraints}
  displayName="Constraint"
  {hasCreateDefinitionCodePermission}
  {hasWriteMetadataPermission}
  {hasWriteDefinitionTagsPermission}
  initialDefinitionAuthor={initialConstraintDefinitionAuthor}
  initialDefinitionCode={initialConstraintDefinitionCode}
  initialDescription={initialConstraintDescription}
  initialId={initialConstraintId}
  initialName={initialConstraintName}
  initialPublic={initialConstraintPublic}
  initialDefinitionTags={initialConstraintDefinitionTags}
  initialMetadataTags={initialConstraintMetadataTags}
  initialOwner={initialConstraintOwner}
  initialRevision={initialConstraintRevision}
  {initialReferenceModelId}
  {permissionError}
  revisions={constraintRevisions}
  {tags}
  tsFiles={constraintsTsFiles}
  {mode}
  {user}
  on:close={onClose}
  on:createDefinition={onCreateNewConstraintDefinition}
  on:createMetadata={onCreateConstraint}
  on:updateDefinitionTags={onSaveConstraintDefinitionRevisionTags}
  on:updateMetadata={onSaveConstraintMetadata}
  on:selectRevision={onRevisionSelection}
  on:selectReferenceModel={onSelectReferenceModel}
/>
