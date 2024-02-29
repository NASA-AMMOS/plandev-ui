<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import HideIcon from '@nasa-jpl/stellar/icons/visible_hide.svg?component';
  import ShowIcon from '@nasa-jpl/stellar/icons/visible_show.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { SearchParameters } from '../../enums/searchParameters';
  import { constraints, constraintsFormColumns } from '../../stores/constraints';
  import type { User, UserId } from '../../types/app';
  import type { ConstraintDefinition, ConstraintMetadata } from '../../types/constraint';
  import type {
    ConstraintDefinitionTagsInsertInput,
    ConstraintMetadataTagsInsertInput,
    Tag,
    TagsChangeEvent,
  } from '../../types/tags';
  import effects from '../../utilities/effects';
  import { getTarget } from '../../utilities/generic';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { diffTags } from '../../utilities/tags';
  import PageTitle from '../app/PageTitle.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import Panel from '../ui/Panel.svelte';
  import RadioButton from '../ui/RadioButtons/RadioButton.svelte';
  import RadioButtons from '../ui/RadioButtons/RadioButtons.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';
  import TagsInput from '../ui/Tags/TagsInput.svelte';
  import ConstraintEditor from './ConstraintEditor.svelte';

  type SavedConstraintMetadata = Pick<ConstraintMetadata, 'description' | 'name' | 'owner' | 'public' | 'tags'>;
  type SavedConstraintDefinition = Pick<ConstraintDefinition, 'definition' | 'tags'>;

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

  const dispatch = createEventDispatcher();

  const permissionError = `You do not have permission to ${mode === 'edit' ? 'edit this' : 'create a'} constraint.`;

  let constraintDefintionAuthor: UserId | null = initialConstraintDefinitionAuthor ?? user?.id ?? null;
  let constraintDefinitionCode: string = initialConstraintDefinitionCode;
  let constraintDefinitionTags: Tag[] = initialConstraintDefinitionTags;
  let constraintDescription: string = initialConstraintDescription;
  let constraintMetadataId: number | null = initialConstraintId;
  let constraintMetadataTags: Tag[] = initialConstraintMetadataTags;
  let constraintName: string = initialConstraintName;
  let constraintNameError: string = '';
  let constraintOwner: UserId = initialConstraintOwner ?? user?.id ?? null;
  let constraintPublic: boolean = initialConstraintPublic;
  let hasCreateDefinitionCodePermission: boolean = false;
  let hasUpdateDefinitionPermission: boolean = false;
  let hasWriteMetadataPermission: boolean = false;
  let isDefinitionModified: boolean = false;
  let isDefinitionDataModified: boolean = false;
  let isMetadataModified: boolean = false;
  let referenceModelId: number | null = initialReferenceModelId;
  let saveButtonEnabled: boolean = false;
  let saveButtonText: string = 'Save';
  let savedConstraintMetadata: SavedConstraintMetadata = {
    description: constraintDescription,
    name: constraintName,
    owner: constraintOwner,
    public: constraintPublic,
    tags: constraintMetadataTags.map(tag => ({ tag })),
  };
  let savedConstraintDefinition: SavedConstraintDefinition = {
    definition: constraintDefinitionCode,
    tags: constraintDefinitionTags.map(tag => ({ tag })),
  };

  $: {
    savedConstraintMetadata = {
      description: initialConstraintDescription,
      name: initialConstraintName,
      owner: initialConstraintOwner,
      public: initialConstraintPublic,
      tags: initialConstraintMetadataTags.map(tag => ({ tag })),
    };
    constraintOwner = initialConstraintOwner ?? user?.id ?? null;
  }
  $: {
    savedConstraintDefinition = {
      definition: initialConstraintDefinitionCode,
      tags: initialConstraintDefinitionTags.map(tag => ({ tag })),
    };
    constraintDefintionAuthor = initialConstraintDefinitionAuthor ?? user?.id ?? null;
    constraintDefinitionCode = initialConstraintDefinitionCode;
    constraintDefinitionTags = initialConstraintDefinitionTags;
  }

  $: isMetadataModified = diffConstraintMetadata(savedConstraintMetadata, {
    description: constraintDescription,
    name: constraintName,
    owner: constraintOwner,
    public: constraintPublic,
    tags: constraintMetadataTags.map(tag => ({ tag })),
  });
  $: isDefinitionModified = diffConstraintDefinition(savedConstraintDefinition, {
    definition: constraintDefinitionCode,
  });
  $: isDefinitionDataModified = diffTags(
    (savedConstraintDefinition.tags || []).map(({ tag }) => tag),
    constraintDefinitionTags,
  );
  $: hasCreateDefinitionCodePermission = featurePermissions.constraints.canCreate(user);
  $: hasUpdateDefinitionPermission =
    user?.id === constraintDefintionAuthor || user?.id === constraintOwner || isDefinitionModified;
  $: hasWriteMetadataPermission =
    mode === 'create'
      ? featurePermissions.constraints.canCreate(user)
      : featurePermissions.constraints.canUpdate(user, { owner: initialConstraintOwner });

  $: pageTitle = mode === 'edit' ? 'Constraints' : 'New Constraint';
  $: pageSubtitle = mode === 'edit' ? savedConstraintMetadata.name : '';
  $: referenceModelId = initialReferenceModelId;
  $: saveButtonEnabled =
    constraintNameError === '' &&
    constraintOwner !== '' &&
    constraintDefinitionCode !== '' &&
    constraintName !== '' &&
    (isMetadataModified || isDefinitionDataModified || isDefinitionModified);
  $: saveButtonClass = saveButtonEnabled ? 'primary' : 'secondary';
  $: if (mode === 'edit' && (isMetadataModified || isDefinitionModified)) {
    saveButtonText = 'Saved';
    if ((isMetadataModified || isDefinitionDataModified) && !isDefinitionModified) {
      saveButtonText = 'Save';
    } else if (isDefinitionModified) {
      saveButtonText = 'Save as new version';
    }
  } else {
    saveButtonText = 'Save';
  }
  $: if (constraintPublic && constraintName) {
    const existingMetadata = $constraints.find(
      ({ name, public: publicConstraint }) => name === constraintName && publicConstraint,
    );
    if (existingMetadata !== undefined && existingMetadata.id !== constraintMetadataId) {
      constraintNameError = 'Constraint name must be unique when public';
    } else {
      constraintNameError = '';
    }
  } else {
    constraintNameError = '';
  }

  function diffConstraintMetadata(
    constraintMetadataA: SavedConstraintMetadata,
    constraintMetadataB: SavedConstraintMetadata,
  ) {
    if (
      constraintMetadataA.description !== constraintMetadataB.description ||
      constraintMetadataA.name !== constraintMetadataB.name ||
      constraintMetadataA.public !== constraintMetadataB.public ||
      constraintMetadataA.owner !== constraintMetadataB.owner ||
      diffTags(
        (constraintMetadataA.tags || []).map(({ tag }) => tag),
        (constraintMetadataB.tags || []).map(({ tag }) => tag),
      )
    ) {
      return true;
    }

    return false;
  }

  function diffConstraintDefinition(
    constraintDefinitionA: Pick<SavedConstraintDefinition, 'definition'>,
    constraintDefinitionB: Pick<SavedConstraintDefinition, 'definition'>,
  ) {
    return constraintDefinitionA.definition !== constraintDefinitionB.definition;
  }

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    constraintDefinitionCode = value;
  }

  async function onDefinitionTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove') {
      constraintDefinitionTags = constraintDefinitionTags.filter(t => t.name !== tag.name);
    } else if (type === 'create' || type === 'select') {
      let tagsToAdd: Tag[] = [tag];
      if (type === 'create') {
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], user)) || [];
      }
      constraintDefinitionTags = constraintDefinitionTags.concat(tagsToAdd);
    }
  }

  async function onMetadataTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove') {
      constraintMetadataTags = constraintMetadataTags.filter(t => t.name !== tag.name);
    } else if (type === 'create' || type === 'select') {
      let tagsToAdd: Tag[] = [tag];
      if (type === 'create') {
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], user)) || [];
      }
      constraintMetadataTags = constraintMetadataTags.concat(tagsToAdd);
    }
  }

  function onSetPublic(event: CustomEvent<{ id: 'public' | 'private' }>) {
    const {
      detail: { id },
    } = event;

    constraintPublic = id === 'public';
  }

  function selectRevision(revision: number | string) {
    dispatch('selectRevision', parseInt(`${revision}`));
  }

  function onRevisionSelection(event: Event) {
    const { value } = getTarget(event);

    selectRevision(`${value}`);
  }

  async function createConstraint() {
    if (saveButtonEnabled) {
      const newConstraintId = await effects.createConstraint(
        constraintName,
        constraintPublic,
        constraintMetadataTags.map(({ id }) => ({ tag_id: id })),
        constraintDefinitionCode,
        constraintDefinitionTags.map(({ id }) => ({ tag_id: id })),
        user,
        constraintDescription,
      );

      if (newConstraintId !== null) {
        goto(
          `${base}/constraints/edit/${newConstraintId}${
            referenceModelId !== null ? `?${SearchParameters.MODEL_ID}=${referenceModelId}` : ''
          }`,
        );
      }
    }
  }

  async function createNewConstraintDefinition() {
    if (saveButtonEnabled && constraintMetadataId !== null) {
      const definition = await effects.createConstraintDefinition(
        constraintMetadataId,
        constraintDefinitionCode,
        constraintDefinitionTags.map(({ id }) => ({ tag_id: id })),
        user,
      );

      if (definition !== null) {
        selectRevision(definition.revision);
      }
    }
  }

  function onSelectReferenceModel(event: CustomEvent<number | null>) {
    const { detail } = event;
    referenceModelId = detail;
    dispatch('selectReferenceModel', detail);
  }

  async function saveConstraint() {
    if (constraintMetadataId) {
      if (isMetadataModified) {
        await saveConstraintMetadata();
      }
      if (isDefinitionDataModified && !isDefinitionModified) {
        await saveConstraintDefinitionRevisionTags();
      } else if (isDefinitionModified) {
        await createNewConstraintDefinition();
      }
    } else {
      await createConstraint();
    }
  }

  async function saveConstraintMetadata() {
    if (constraintMetadataId !== null) {
      const tagsToUpdate: ConstraintMetadataTagsInsertInput[] = (constraintMetadataTags || []).map(
        ({ id: tag_id }) => ({
          constraint_id: constraintMetadataId as number,
          tag_id,
        }),
      );
      // Disassociate old tags from constraint
      const tagIdsToDelete = savedConstraintMetadata.tags
        .filter(({ tag }) => !constraintMetadataTags.find(t => tag.id === t.id))
        .map(({ tag }) => tag.id);

      const updated = await effects.updateConstraintMetadata(
        constraintMetadataId,
        {
          description: constraintDescription,
          name: constraintName,
          owner: constraintOwner,
          public: constraintPublic,
        },
        tagsToUpdate,
        tagIdsToDelete,
        initialConstraintOwner,
        user,
      );

      if (updated) {
        savedConstraintMetadata = {
          description: constraintDescription,
          name: constraintName,
          owner: constraintOwner,
          public: constraintPublic,
          tags: constraintMetadataTags.map(tag => ({ tag })),
        };
      }
    }
  }

  async function saveConstraintDefinitionRevisionTags() {
    if (constraintMetadataId !== null && initialConstraintRevision !== null) {
      // Associate new tags with constraint definition version
      const tagsToUpdate: ConstraintDefinitionTagsInsertInput[] = constraintDefinitionTags.map(({ id: tag_id }) => ({
        constraint_id: constraintMetadataId as number,
        constraint_revision: initialConstraintRevision as number,
        tag_id,
      }));

      // Disassociate old tags from constraint
      const tagIdsToDelete = initialConstraintDefinitionTags
        .filter(tag => !constraintDefinitionTags.find(t => tag.id === t.id))
        .map(tag => tag.id);
      await effects.updateConstraintDefinitionTags(
        constraintMetadataId,
        initialConstraintRevision,
        tagsToUpdate,
        tagIdsToDelete,
        user,
      );
    }
  }

  function revertConstraint() {
    constraintDefintionAuthor = initialConstraintDefinitionAuthor ?? user?.id ?? null;
    constraintDefinitionCode = initialConstraintDefinitionCode;
    constraintDefinitionTags = initialConstraintDefinitionTags;
    constraintDescription = initialConstraintDescription;
    constraintMetadataId = initialConstraintId;
    constraintMetadataTags = initialConstraintMetadataTags;
    constraintName = initialConstraintName;
    constraintOwner = initialConstraintOwner ?? user?.id ?? null;
    constraintPublic = initialConstraintPublic;
  }
</script>

<PageTitle subTitle={pageSubtitle} title={pageTitle} />

<CssGrid bind:columns={$constraintsFormColumns}>
  <Panel overflowYBody="hidden" padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>{mode === 'create' ? 'New Constraint' : 'Edit Constraint'}</SectionTitle>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={() => goto(`${base}/constraints`)}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        {#if mode === 'edit' && saveButtonEnabled}
          <button class="st-button secondary ellipsis" on:click={revertConstraint}> Revert </button>
        {/if}
        <button
          class="st-button {saveButtonClass} ellipsis"
          disabled={!saveButtonEnabled}
          use:permissionHandler={{
            hasPermission: saveButtonEnabled,
            permissionError,
          }}
          on:click={saveConstraint}
        >
          {saveButtonText}
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      <fieldset>
        <label for="constraint-name">Name</label>
        <input
          bind:value={constraintName}
          autocomplete="off"
          class:constraint-form-error={!!constraintNameError}
          class="st-input w-100"
          name="constraint-name"
          placeholder="Enter Constraint Name (required)"
          required
          use:permissionHandler={{
            hasPermission: hasWriteMetadataPermission,
            permissionError,
          }}
        />
        <div class="constraint-form-error-message">{constraintNameError}</div>
      </fieldset>

      <fieldset>
        <label for="constraintOwner">Owner</label>
        <input
          bind:value={constraintOwner}
          class="st-input w-100"
          name="constraintOwner"
          placeholder="Enter Constraint Owner Username (required)"
          use:permissionHandler={{
            hasPermission: hasWriteMetadataPermission,
            permissionError,
          }}
        />
      </fieldset>

      <fieldset>
        <label for="constraint-description">Description</label>
        <textarea
          bind:value={constraintDescription}
          autocomplete="off"
          class="st-input w-100"
          name="constraint-description"
          placeholder="Enter Constraint Description (optional)"
          use:permissionHandler={{
            hasPermission: hasWriteMetadataPermission,
            permissionError,
          }}
        />
      </fieldset>

      <fieldset>
        <label for="metadataTags">Tags</label>
        <TagsInput
          name="metadataTags"
          use={[
            [
              permissionHandler,
              {
                hasPermission: hasWriteMetadataPermission,
                permissionError,
              },
            ],
          ]}
          options={tags}
          selected={constraintMetadataTags}
          on:change={onMetadataTagsInputChange}
        />
      </fieldset>

      {#if mode === 'edit'}
        <fieldset>
          <label for="constraintId">Constraint ID</label>
          <input class="st-input w-100" disabled name="constraintId" value={constraintMetadataId} />
        </fieldset>
      {/if}

      <fieldset>
        <label for="public">Visibility</label>
        <RadioButtons selectedButtonId={constraintPublic ? 'public' : 'private'} on:select-radio-button={onSetPublic}>
          <RadioButton
            id="private"
            use={[
              [
                permissionHandler,
                {
                  hasPermission: hasWriteMetadataPermission,
                  permissionError,
                },
              ],
            ]}><div class="public-button"><HideIcon /><span>Private</span></div></RadioButton
          >
          <RadioButton
            id="public"
            use={[
              [
                permissionHandler,
                {
                  hasPermission: hasWriteMetadataPermission,
                  permissionError,
                },
              ],
            ]}><div class="public-button"><ShowIcon /><span>Public</span></div></RadioButton
          >
        </RadioButtons>
      </fieldset>

      <div class="definition-divider" />

      {#if mode === 'edit'}
        <fieldset>
          <label for="versions">Version</label>
          {#if !isDefinitionModified}
            <select
              value={initialConstraintRevision}
              class="st-select w-100"
              name="versions"
              on:change={onRevisionSelection}
            >
              {#each constraintRevisions as revision}
                <option value={revision}>
                  {revision}
                </option>
              {/each}
            </select>
          {:else}
            <select disabled class="st-select w-100" name="versions">
              <option value={constraintRevisions[constraintRevisions.length - 1] + 1}>
                {constraintRevisions[constraintRevisions.length - 1] + 1} (Next version)
              </option>
            </select>
          {/if}
        </fieldset>
      {/if}

      <fieldset>
        <label for="constraintDefinitionAuthor">Author</label>
        <input
          disabled
          value={constraintDefintionAuthor}
          class="st-input w-100"
          name="constraintDefinitionAuthor"
          use:permissionHandler={{
            hasPermission: hasWriteMetadataPermission,
            permissionError,
          }}
        />
      </fieldset>

      <fieldset>
        <label for="definitionTags">Version Tags</label>
        <TagsInput
          name="definitionTags"
          use={[
            [
              permissionHandler,
              {
                hasPermission: hasUpdateDefinitionPermission,
                permissionError,
              },
            ],
          ]}
          options={tags}
          selected={constraintDefinitionTags}
          on:change={onDefinitionTagsInputChange}
        />
      </fieldset>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <ConstraintEditor
    constraintDefinition={constraintDefinitionCode}
    {referenceModelId}
    readOnly={!hasCreateDefinitionCodePermission}
    title="{mode === 'create' ? 'New' : 'Edit'} Constraint - Definition Editor"
    {user}
    on:didChangeModelContent={onDidChangeModelContent}
    on:selectReferenceModel={onSelectReferenceModel}
  />
</CssGrid>

<style>
  .public-button {
    column-gap: 0.3rem;
    display: grid;
    grid-template-columns: min-content min-content;
  }

  .definition-divider {
    border-top: 1px solid var(--st-gray-20);
    display: grid;
    margin: 2rem 1rem;
  }

  .constraint-form-error {
    border-color: var(--st-error-red);
    color: var(--st-error-red);
  }

  .constraint-form-error-message {
    color: var(--st-error-red);
    margin: 0.25rem;
  }
</style>
