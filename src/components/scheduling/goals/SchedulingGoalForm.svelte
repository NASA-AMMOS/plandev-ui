<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { createEventDispatcher } from 'svelte';
  import { SchedulingType } from '../../../constants/scheduling';
  import { DefinitionType } from '../../../enums/association';
  import { SearchParameters } from '../../../enums/searchParameters';
  import { schedulingGoals } from '../../../stores/scheduling';
  import type { User, UserId } from '../../../types/app';
  import type { TypeScriptFile } from '../../../types/monaco';
  import type {
    SchedulingGoalDefinitionTagsInsertInput,
    SchedulingGoalMetadataTagsInsertInput,
    Tag,
  } from '../../../types/tags';
  import effects from '../../../utilities/effects';
  import { featurePermissions } from '../../../utilities/permissions';
  import AssociationForm from '../../ui/Association/AssociationForm.svelte';

  export let initialGoalDefinitionAuthor: UserId | undefined = undefined;
  export let initialGoalDefinitionCode: string | null = null;
  export let initialGoalDefinitionFilename: string | null = null;
  export let initialGoalDescription: string = '';
  export let initialGoalId: number | null = null;
  export let initialGoalName: string = '';
  export let initialGoalPublic: boolean = true;
  export let initialGoalDefinitionTags: Tag[] = [];
  export let initialGoalDefinitionType: SchedulingType = SchedulingType.EDSL;
  export let initialGoalMetadataTags: Tag[] = [];
  export let initialGoalOwner: UserId = null;
  export let initialGoalRevision: number | null = null;
  export let initialReferenceModelId: number | null = null;
  export let goalRevisions: number[] = [];
  export let tags: Tag[] = [];
  export let mode: 'create' | 'edit' = 'create';
  export let user: User | null;

  const dispatch = createEventDispatcher<{
    selectReferenceModel: number | null;
    selectRevision: number;
  }>();

  const permissionError = `You do not have permission to ${
    mode === 'edit' ? 'edit this' : 'create a'
  } scheduling goal.`;

  let goalsTsFiles: TypeScriptFile[] = [];
  let hasCreateDefinitionCodePermission: boolean = false;
  let hasWriteDefinitionTagsPermission: boolean = false;
  let hasWriteMetadataPermission: boolean = false;

  $: hasCreateDefinitionCodePermission = featurePermissions.schedulingGoals.canCreate(user);
  $: if (user) {
    hasWriteDefinitionTagsPermission = featurePermissions.schedulingGoals.canUpdateDefinition(user, {
      author: mode === 'create' ? user.id : initialGoalDefinitionAuthor ?? user.id,
    });
  }
  $: hasWriteMetadataPermission =
    mode === 'create'
      ? featurePermissions.schedulingGoals.canCreate(user)
      : featurePermissions.schedulingGoals.canUpdate(user, { owner: initialGoalOwner });
  $: selectReferenceModel(initialReferenceModelId);

  function selectReferenceModel(modelId: number | null) {
    if (modelId !== null) {
      effects.getTsFilesScheduling(modelId, user).then(tsFiles => (goalsTsFiles = tsFiles));
    } else {
      goalsTsFiles = [];
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
    goto(`${base}/scheduling/goals`);
  }

  async function onCreateGoal(
    event: CustomEvent<{
      definitionCode: string | null;
      definitionFile?: File | null;
      definitionTags: Tag[];
      definitionType?: DefinitionType;
      description: string;
      name: string;
      public: boolean;
      tags: Tag[];
    }>,
  ) {
    const {
      detail: {
        definitionCode,
        definitionFile,
        definitionTags,
        definitionType,
        description,
        name,
        public: isPublic,
        tags,
      },
    } = event;

    const newGoalId = await effects.createSchedulingGoal(
      name,
      isPublic,
      tags.map(({ id }) => ({ tag_id: id })),
      definitionType === DefinitionType.CODE ? SchedulingType.EDSL : SchedulingType.JAR,
      definitionCode,
      definitionFile ?? null,
      definitionTags.map(({ id }) => ({ tag_id: id })),
      user,
      description,
    );

    if (newGoalId !== null) {
      goto(
        `${base}/scheduling/goals/edit/${newGoalId}${
          initialReferenceModelId !== null ? `?${SearchParameters.MODEL_ID}=${initialReferenceModelId}` : ''
        }`,
      );
    }
  }

  async function onCreateNewGoalDefinition(
    event: CustomEvent<{
      definitionCode: string | null;
      definitionFile?: File | null;
      definitionTags: Tag[];
      definitionType?: DefinitionType;
    }>,
  ) {
    const {
      detail: { definitionCode, definitionFile, definitionTags, definitionType },
    } = event;
    if (initialGoalId !== null) {
      const definition = await effects.createSchedulingGoalDefinition(
        initialGoalId,
        definitionType === DefinitionType.CODE ? SchedulingType.EDSL : SchedulingType.JAR,
        definitionCode,
        definitionFile ?? null,
        definitionTags.map(({ id }) => ({ tag_id: id })),
        user,
      );

      if (definition !== null) {
        selectRevision(definition.revision);
      }
    }
  }

  async function onSaveGoalMetadata(
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
    if (initialGoalId !== null) {
      const {
        detail: {
          metadata: { description, name, owner, public: isPublic },
          tagIdsToDelete,
          tagsToUpdate,
        },
      } = event;
      const goalMetadataTagsToUpdate: SchedulingGoalMetadataTagsInsertInput[] = tagsToUpdate.map(({ id }) => ({
        goal_id: initialGoalId as number,
        tag_id: id,
      }));

      await effects.updateSchedulingGoalMetadata(
        initialGoalId,
        {
          description,
          name,
          owner,
          public: isPublic,
        },
        goalMetadataTagsToUpdate,
        tagIdsToDelete,
        initialGoalOwner,
        user,
      );
    }
  }

  async function onSaveGoalDefinitionRevisionTags(
    event: CustomEvent<{
      tagIdsToDelete: number[];
      tagsToUpdate: Tag[];
    }>,
  ) {
    if (initialGoalId !== null && initialGoalRevision !== null && initialGoalDefinitionAuthor !== undefined) {
      const {
        detail: { tagIdsToDelete, tagsToUpdate },
      } = event;
      // Associate new tags with goal definition version
      const goalDefinitionTagsToUpdate: SchedulingGoalDefinitionTagsInsertInput[] = tagsToUpdate.map(({ id }) => ({
        goal_id: initialGoalId as number,
        goal_revision: initialGoalRevision as number,
        tag_id: id,
      }));
      await effects.updateSchedulingGoalDefinitionTags(
        initialGoalId,
        initialGoalRevision,
        initialGoalDefinitionAuthor,
        goalDefinitionTagsToUpdate,
        tagIdsToDelete,
        user,
      );
    }
  }
</script>

<AssociationForm
  allMetadata={$schedulingGoals}
  defaultDefinitionCode={`export default (): GlobalSchedulingGoal => {\n\n}\n`}
  definitionTypeConfigurations={{
    code: { label: 'EDSL' },
    file: { accept: '.jar', label: 'JAR File' },
  }}
  displayName="Scheduling Goal"
  {hasCreateDefinitionCodePermission}
  {hasWriteDefinitionTagsPermission}
  {hasWriteMetadataPermission}
  initialDefinitionAuthor={initialGoalDefinitionAuthor}
  initialDefinitionType={initialGoalDefinitionType === SchedulingType.EDSL ? DefinitionType.CODE : DefinitionType.FILE}
  initialDefinitionCode={initialGoalDefinitionCode}
  initialDefinitionFileName={initialGoalDefinitionFilename}
  initialDescription={initialGoalDescription}
  initialId={initialGoalId}
  initialName={initialGoalName}
  initialPublic={initialGoalPublic}
  initialDefinitionTags={initialGoalDefinitionTags}
  initialMetadataTags={initialGoalMetadataTags}
  initialOwner={initialGoalOwner}
  initialRevision={initialGoalRevision}
  {initialReferenceModelId}
  {permissionError}
  revisions={goalRevisions}
  {tags}
  showDefinitionTypeSelector={true}
  tsFiles={goalsTsFiles}
  {mode}
  {user}
  on:close={onClose}
  on:createDefinition={onCreateNewGoalDefinition}
  on:createMetadata={onCreateGoal}
  on:updateDefinitionTags={onSaveGoalDefinitionRevisionTags}
  on:updateMetadata={onSaveGoalMetadata}
  on:selectRevision={onRevisionSelection}
  on:selectReferenceModel={onSelectReferenceModel}
/>
