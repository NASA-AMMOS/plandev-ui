<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { createEventDispatcher } from 'svelte';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { schedulingConditions } from '../../../stores/scheduling';
  import type { User, UserId } from '../../../types/app';
  import type { TypeScriptFile } from '../../../types/monaco';
  import type {
    SchedulingConditionDefinitionTagsInsertInput,
    SchedulingConditionMetadataTagsInsertInput,
    Tag,
  } from '../../../types/tags';
  import effects from '../../../utilities/effects';
  import { featurePermissions } from '../../../utilities/permissions';
  import AssociationForm from '../../ui/Association/AssociationForm.svelte';

  export let initialConditionDefinitionAuthor: UserId | undefined = undefined;
  export let initialConditionDefinitionCode: string = 'export default (): GlobalSchedulingCondition => {\n\n}\n';
  export let initialConditionDescription: string = '';
  export let initialConditionId: number | null = null;
  export let initialConditionName: string = '';
  export let initialConditionPublic: boolean = true;
  export let initialConditionDefinitionTags: Tag[] = [];
  export let initialConditionMetadataTags: Tag[] = [];
  export let initialConditionOwner: UserId = null;
  export let initialConditionRevision: number | null = null;
  export let initialReferenceModelId: number | null = null;
  export let conditionRevisions: number[] = [];
  export let tags: Tag[] = [];
  export let mode: 'create' | 'edit' = 'create';
  export let user: User | null;

  const dispatch = createEventDispatcher();

  const permissionError = `You do not have permission to ${
    mode === 'edit' ? 'edit this' : 'create a'
  } scheduling condition.`;

  let hasCreateDefinitionCodePermission: boolean = false;
  let hasWriteMetadataPermission: boolean = false;

  let conditionsTsFiles: TypeScriptFile[] = [];
  $: hasCreateDefinitionCodePermission = featurePermissions.schedulingConditions.canCreate(user);
  $: hasWriteMetadataPermission =
    mode === 'create'
      ? featurePermissions.schedulingConditions.canCreate(user)
      : featurePermissions.schedulingConditions.canUpdate(user, { owner: initialConditionOwner });
  $: selectReferenceModel(initialReferenceModelId);

  function selectReferenceModel(modelId: number | null) {
    if (modelId !== null) {
      effects.getTsFilesScheduling(modelId, user).then(tsFiles => (conditionsTsFiles = tsFiles));
    } else {
      conditionsTsFiles = [];
    }
  }

  function selectRevision(revision: number | string) {
    dispatch('selectRevision', parseInt(`${revision}`));
  }

  function onRevisionSelection(event: CustomEvent) {
    const { detail } = event;

    selectRevision(`${detail}`);
  }

  function onSelectReferenceModel(event: CustomEvent<number | null>) {
    const { detail: modelId } = event;
    selectReferenceModel(modelId);
    dispatch('selectReferenceModel', modelId);
  }

  function onClose() {
    goto(`${base}/scheduling/conditions`);
  }

  async function onCreateCondition(
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

    const newConditionId = await effects.createSchedulingCondition(
      name,
      isPublic,
      tags.map(({ id }) => ({ tag_id: id })),
      definition.code,
      definition.tags.map(({ id }) => ({ tag_id: id })),
      user,
      description,
    );

    if (newConditionId !== null) {
      goto(
        `${base}/scheduling/conditions/edit/${newConditionId}${
          initialReferenceModelId !== null ? `?${SearchParameters.MODEL_ID}=${initialReferenceModelId}` : ''
        }`,
      );
    }
  }

  async function onCreateNewConditionDefinition(
    event: CustomEvent<{
      definitionCode: string;
      definitionTags: Tag[];
    }>,
  ) {
    const {
      detail: { definitionCode, definitionTags },
    } = event;
    if (initialConditionId !== null) {
      const definition = await effects.createSchedulingConditionDefinition(
        initialConditionId,
        definitionCode,
        definitionTags.map(({ id }) => ({ tag_id: id })),
        user,
      );

      if (definition !== null) {
        selectRevision(definition.revision);
      }
    }
  }

  async function onSaveConditionMetadata(
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
    if (initialConditionId !== null) {
      const {
        detail: {
          metadata: { description, name, owner, public: isPublic },
          tagIdsToDelete,
          tagsToUpdate,
        },
      } = event;
      const conditionMetadataTagsToUpdate: SchedulingConditionMetadataTagsInsertInput[] = tagsToUpdate.map(
        ({ id }) => ({
          condition_id: initialConditionId as number,
          tag_id: id,
        }),
      );

      await effects.updateSchedulingConditionMetadata(
        initialConditionId,
        {
          description,
          name,
          owner,
          public: isPublic,
        },
        conditionMetadataTagsToUpdate,
        tagIdsToDelete,
        initialConditionOwner,
        user,
      );
    }
  }

  async function onSaveConditionDefinitionRevisionTags(
    event: CustomEvent<{
      tagIdsToDelete: number[];
      tagsToUpdate: Tag[];
    }>,
  ) {
    if (initialConditionId !== null && initialConditionRevision !== null) {
      const {
        detail: { tagIdsToDelete, tagsToUpdate },
      } = event;
      // Associate new tags with condition definition version
      const conditionDefinitionTagsToUpdate: SchedulingConditionDefinitionTagsInsertInput[] = tagsToUpdate.map(
        ({ id }) => ({
          condition_id: initialConditionId as number,
          condition_revision: initialConditionRevision as number,
          tag_id: id,
        }),
      );
      await effects.updateSchedulingConditionDefinitionTags(
        initialConditionId,
        initialConditionRevision,
        conditionDefinitionTagsToUpdate,
        tagIdsToDelete,
        user,
      );
    }
  }
</script>

<AssociationForm
  allMetadata={$schedulingConditions}
  displayName="Scheduling Condition"
  {hasCreateDefinitionCodePermission}
  {hasWriteMetadataPermission}
  initialDefinitionAuthor={initialConditionDefinitionAuthor}
  initialDefinitionCode={initialConditionDefinitionCode}
  initialDescription={initialConditionDescription}
  initialId={initialConditionId}
  initialName={initialConditionName}
  initialPublic={initialConditionPublic}
  initialDefinitionTags={initialConditionDefinitionTags}
  initialMetadataTags={initialConditionMetadataTags}
  initialOwner={initialConditionOwner}
  initialRevision={initialConditionRevision}
  {initialReferenceModelId}
  {permissionError}
  revisions={conditionRevisions}
  {tags}
  tsFiles={conditionsTsFiles}
  {mode}
  {user}
  on:close={onClose}
  on:createDefinition={onCreateNewConditionDefinition}
  on:createMetadata={onCreateCondition}
  on:updateDefinitionTags={onSaveConditionDefinitionRevisionTags}
  on:updateMetadata={onSaveConditionMetadata}
  on:selectRevision={onRevisionSelection}
  on:selectReferenceModel={onSelectReferenceModel}
/>
