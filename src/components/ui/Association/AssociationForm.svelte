<svelte:options immutable={true} />

<script lang="ts">
  import type { RadioButtonId } from '../../../types/radio-buttons';

  import type { Dispatcher } from '../../../types/component';

  type FormDefinition = $$Generic<BaseDefinition>;
  type FormMetadata = $$Generic<BaseMetadata<FormDefinition>>;

  // eslint-disable-next-line
  interface $$Events extends ComponentEvents<SvelteComponent> {
    close: CustomEvent;
    createDefinition: CustomEvent<{
      definitionCode: string;
      definitionTags: Tag[];
    }>;
    createMetadata: CustomEvent<{
      definition: {
        code: string;
        tags: Tag[];
      };
      description: string;
      name: string;
      public: boolean;
      tags: Tag[];
    }>;
    selectReferenceModel: CustomEvent<number | null>;
    selectRevision: CustomEvent<number>;
    updateDefinitionTags: CustomEvent<{
      tagIdsToDelete: number[];
      tagsToUpdate: Tag[];
    }>;
    updateMetadata: CustomEvent<{
      metadata: {
        description: string;
        name: string;
        owner: UserId;
        public: boolean;
      };
      tagIdsToDelete: number[];
      tagsToUpdate: Tag[];
    }>;
  }

  import HideIcon from '@nasa-jpl/stellar/icons/visible_hide.svg?component';
  import ShowIcon from '@nasa-jpl/stellar/icons/visible_show.svg?component';
  import { SvelteComponent, createEventDispatcher, type ComponentEvents } from 'svelte';
  import type { User, UserId } from '../../../types/app';
  import type { BaseDefinition, BaseMetadata } from '../../../types/metadata';
  import type { TypeScriptFile } from '../../../types/monaco';
  import type { Tag, TagsChangeEvent } from '../../../types/tags';
  import effects from '../../../utilities/effects';
  import { getTarget } from '../../../utilities/generic';
  import { permissionHandler } from '../../../utilities/permissionHandler';
  import { diffTags } from '../../../utilities/tags';
  import PageTitle from '../../app/PageTitle.svelte';
  import CssGrid from '../CssGrid.svelte';
  import CssGridGutter from '../CssGridGutter.svelte';
  import Panel from '../Panel.svelte';
  import RadioButton from '../RadioButtons/RadioButton.svelte';
  import RadioButtons from '../RadioButtons/RadioButtons.svelte';
  import SectionTitle from '../SectionTitle.svelte';
  import TagsInput from '../Tags/TagsInput.svelte';
  import DefinitionEditor from './DefinitionEditor.svelte';

  type SavedMetadata = Pick<FormMetadata, 'description' | 'name' | 'owner' | 'public' | 'tags'>;
  type SavedDefinition = Pick<FormDefinition, 'definition' | 'tags'>;

  export let allMetadata: FormMetadata[] = [];
  export let displayName: string = '';
  export let formColumns: string = '1fr 3px 2fr';
  export let hasCreateDefinitionCodePermission: boolean = false;
  export let hasWriteMetadataPermission: boolean = false;
  export let initialDefinitionAuthor: UserId | undefined = undefined;
  export let initialDefinitionCode: string = 'export default ():  => {\n\n}\n';
  export let initialDescription: string = '';
  export let initialId: number | null = null;
  export let initialName: string = '';
  export let initialPublic: boolean = true;
  export let initialDefinitionTags: Tag[] = [];
  export let initialMetadataTags: Tag[] = [];
  export let initialOwner: UserId = null;
  export let initialRevision: number | null = null;
  export let initialReferenceModelId: number | null = null;
  export let permissionError: string = '';
  export let revisions: number[] = [];
  export let tags: Tag[] = [];
  export let tsFiles: TypeScriptFile[] = [];
  export let mode: 'create' | 'edit' = 'create';
  export let user: User | null;

  const dispatch = createEventDispatcher<Dispatcher<$$Events>>();

  let defintionAuthor: UserId | null = initialDefinitionAuthor ?? user?.id ?? null;
  let definitionCode: string = initialDefinitionCode;
  let definitionTags: Tag[] = initialDefinitionTags;
  let description: string = initialDescription;
  let hasUpdateDefinitionPermission = false;
  let metadataId: number | null = initialId;
  let metadataTags: Tag[] = initialMetadataTags;
  let name: string = initialName;
  let nameError: string = '';
  let owner: UserId = initialOwner ?? user?.id ?? null;
  let isPublic: boolean = initialPublic;
  let isDefinitionModified: boolean = false;
  let isDefinitionDataModified: boolean = false;
  let isMetadataModified: boolean = false;
  let referenceModelId: number | null = initialReferenceModelId;
  let saveButtonEnabled: boolean = false;
  let saveButtonText: string = 'Save';

  let prevMetadataTags: Tag[] = initialMetadataTags;
  let prevDefinitionTags: Tag[] = initialDefinitionTags;

  $: if (diffTags(prevMetadataTags, initialMetadataTags)) {
    metadataTags = initialMetadataTags;
    prevMetadataTags = initialMetadataTags;
  }
  $: defintionAuthor = initialDefinitionAuthor ?? user?.id ?? null;
  $: definitionCode = initialDefinitionCode;
  $: if (diffTags(prevDefinitionTags, initialDefinitionTags)) {
    definitionTags = initialDefinitionTags;
    prevDefinitionTags = initialDefinitionTags;
  }

  $: isMetadataModified = diffMetadata(
    {
      description: initialDescription,
      name: initialName,
      owner: initialOwner,
      public: initialPublic,
      tags: initialMetadataTags.map(tag => ({ tag })),
    },
    {
      description,
      name,
      owner,
      public: isPublic,
      tags: metadataTags.map(tag => ({ tag })),
    },
  );
  $: isDefinitionModified = diffDefinition({ definition: initialDefinitionCode }, { definition: definitionCode });
  $: isDefinitionDataModified = diffTags(initialDefinitionTags || [], definitionTags);
  $: hasUpdateDefinitionPermission = user?.id === defintionAuthor || user?.id === initialOwner || isDefinitionModified;
  $: pageTitle = mode === 'edit' ? 's' : 'New ';
  $: pageSubtitle = mode === 'edit' ? initialName : '';
  $: referenceModelId = initialReferenceModelId;
  $: saveButtonEnabled =
    nameError === '' &&
    owner !== '' &&
    definitionCode !== '' &&
    name !== '' &&
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
  $: if (isPublic && name) {
    const existingMetadata = allMetadata.find(
      ({ name: metadataName, public: isPublic }) => name === metadataName && isPublic,
    );
    if (existingMetadata != null && existingMetadata.id !== metadataId) {
      nameError = 'Name must be unique when public';
    } else {
      nameError = '';
    }
  } else {
    nameError = '';
  }

  function diffMetadata(metadataA: SavedMetadata, metadataB: SavedMetadata) {
    if (
      metadataA.description !== metadataB.description ||
      metadataA.name !== metadataB.name ||
      metadataA.public !== metadataB.public ||
      metadataA.owner !== metadataB.owner ||
      diffTags(
        (metadataA.tags || []).map(({ tag }) => tag),
        (metadataB.tags || []).map(({ tag }) => tag),
      )
    ) {
      return true;
    }

    return false;
  }

  function diffDefinition(
    definitionA: Pick<SavedDefinition, 'definition'>,
    definitionB: Pick<SavedDefinition, 'definition'>,
  ) {
    return definitionA.definition !== definitionB.definition;
  }

  function onDidChangeModelContent(event: CustomEvent<{ value: string }>) {
    const { detail } = event;
    const { value } = detail;
    definitionCode = value;
  }

  async function onDefinitionTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove') {
      definitionTags = definitionTags.filter(t => t.name !== tag.name);
    } else if (type === 'create' || type === 'select') {
      let tagsToAdd: Tag[] = [tag];
      if (type === 'create') {
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], user)) || [];
      }
      definitionTags = definitionTags.concat(tagsToAdd);
    }
  }

  async function onMetadataTagsInputChange(event: TagsChangeEvent) {
    const {
      detail: { tag, type },
    } = event;
    if (type === 'remove') {
      metadataTags = metadataTags.filter(t => t.name !== tag.name);
    } else if (type === 'create' || type === 'select') {
      let tagsToAdd: Tag[] = [tag];
      if (type === 'create') {
        tagsToAdd = (await effects.createTags([{ color: tag.color, name: tag.name }], user)) || [];
      }
      metadataTags = metadataTags.concat(tagsToAdd);
    }
  }

  function onSetPublic(event: CustomEvent<{ id: RadioButtonId }>) {
    const {
      detail: { id },
    } = event;

    isPublic = id === 'public';
  }

  function selectRevision(revision: number | string) {
    dispatch('selectRevision', parseInt(`${revision}`));
  }

  function onRevisionSelection(event: Event) {
    const { value } = getTarget(event);

    selectRevision(`${value}`);
  }

  function onClose() {
    dispatch('close');
  }

  async function create() {
    if (saveButtonEnabled) {
      dispatch('createMetadata', {
        definition: {
          code: definitionCode,
          tags: definitionTags,
        },
        description,
        name,
        public: isPublic,
        tags: metadataTags,
      });
    }
  }

  async function createNewDefinition() {
    if (saveButtonEnabled && metadataId !== null) {
      dispatch('createDefinition', {
        definitionCode,
        definitionTags,
      });
    }
  }

  function onSelectReferenceModel(event: CustomEvent<number | null>) {
    const { detail } = event;
    referenceModelId = detail;
    dispatch('selectReferenceModel', detail);
  }

  async function save() {
    if (metadataId) {
      if (isMetadataModified) {
        await saveMetadata();
      }
      if (isDefinitionDataModified && !isDefinitionModified) {
        await saveDefinitionRevisionTags();
      } else if (isDefinitionModified) {
        await createNewDefinition();
      }
    } else {
      await create();
    }
  }

  async function saveMetadata() {
    if (metadataId !== null) {
      // Disassociate old tags from metadata
      const tagIdsToDelete = initialMetadataTags
        .filter(({ id }) => !metadataTags.find(t => id === t.id))
        .map(({ id }) => id);

      dispatch('updateMetadata', {
        metadata: {
          description: description,
          name: name,
          owner: owner,
          public: isPublic,
        },
        tagIdsToDelete,
        tagsToUpdate: metadataTags,
      });
    }
  }

  async function saveDefinitionRevisionTags() {
    if (metadataId !== null && initialRevision !== null) {
      // Disassociate old tags from definition
      const tagIdsToDelete = initialDefinitionTags
        .filter(tag => !definitionTags.find(t => tag.id === t.id))
        .map(tag => tag.id);

      dispatch('updateDefinitionTags', {
        tagIdsToDelete,
        tagsToUpdate: definitionTags,
      });
    }
  }

  function revert() {
    defintionAuthor = initialDefinitionAuthor ?? user?.id ?? null;
    definitionCode = initialDefinitionCode;
    definitionTags = initialDefinitionTags;
    description = initialDescription;
    metadataId = initialId;
    metadataTags = initialMetadataTags;
    name = initialName;
    owner = initialOwner ?? user?.id ?? null;
    isPublic = initialPublic;
  }
</script>

<PageTitle subTitle={pageSubtitle} title={pageTitle} />

<CssGrid bind:columns={formColumns}>
  <Panel overflowYBody="hidden" padBody={false}>
    <svelte:fragment slot="header">
      <SectionTitle>{mode === 'create' ? `New ${displayName}` : `Edit ${displayName}`}</SectionTitle>

      <div class="right">
        <button class="st-button secondary ellipsis" on:click={onClose}>
          {mode === 'create' ? 'Cancel' : 'Close'}
        </button>
        {#if mode === 'edit' && saveButtonEnabled}
          <button class="st-button secondary ellipsis" on:click={revert}> Revert </button>
        {/if}
        <button
          class="st-button {saveButtonClass} ellipsis"
          disabled={!saveButtonEnabled}
          use:permissionHandler={{
            hasPermission: saveButtonEnabled,
            permissionError,
          }}
          on:click={save}
        >
          {saveButtonText}
        </button>
      </div>
    </svelte:fragment>

    <svelte:fragment slot="body">
      <fieldset>
        <label for="metadata-name">Name</label>
        <input
          bind:value={name}
          autocomplete="off"
          class:metadata-form-error={!!nameError}
          class="st-input w-100"
          name="metadata-name"
          placeholder={`Enter ${displayName} Name (required)`}
          required
          use:permissionHandler={{
            hasPermission: hasWriteMetadataPermission,
            permissionError,
          }}
        />
        <div class="metadata-form-error-message">{nameError}</div>
      </fieldset>

      <fieldset>
        <label for="owner">Owner</label>
        <input
          bind:value={owner}
          class="st-input w-100"
          name="owner"
          placeholder={`Enter ${displayName} Owner Username (required)`}
          use:permissionHandler={{
            hasPermission: hasWriteMetadataPermission,
            permissionError,
          }}
        />
      </fieldset>

      <fieldset>
        <label for="metadata-description">Description</label>
        <textarea
          bind:value={description}
          autocomplete="off"
          class="st-input w-100"
          name="metadata-description"
          placeholder={`Enter ${displayName} Description (optional)`}
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
          selected={metadataTags}
          on:change={onMetadataTagsInputChange}
        />
      </fieldset>

      {#if mode === 'edit'}
        <fieldset>
          <label for="id">{displayName} ID</label>
          <input class="st-input w-100" disabled name="id" value={metadataId} />
        </fieldset>
      {/if}

      <fieldset>
        <label for="public">Visibility</label>
        <RadioButtons selectedButtonId={isPublic ? 'public' : 'private'} on:select-radio-button={onSetPublic}>
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
            <select value={initialRevision} class="st-select w-100" name="versions" on:change={onRevisionSelection}>
              {#each revisions as revision}
                <option value={revision}>
                  {revision}
                </option>
              {/each}
            </select>
          {:else}
            <select disabled class="st-select w-100" name="versions">
              <option value={revisions[revisions.length - 1] + 1}>
                {revisions[revisions.length - 1] + 1} (Next version)
              </option>
            </select>
          {/if}
        </fieldset>
      {/if}

      <fieldset>
        <label for="definitionAuthor">Author</label>
        <input
          disabled
          value={defintionAuthor}
          class="st-input w-100"
          name="definitionAuthor"
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
          selected={definitionTags}
          on:change={onDefinitionTagsInputChange}
        />
      </fieldset>
    </svelte:fragment>
  </Panel>

  <CssGridGutter track={1} type="column" />

  <DefinitionEditor
    definition={definitionCode}
    {referenceModelId}
    readOnly={!hasCreateDefinitionCodePermission}
    {tsFiles}
    title={`${mode === 'create' ? 'New' : 'Edit'} ${displayName} - Definition Editor`}
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

  .metadata-form-error {
    border-color: var(--st-error-red);
    color: var(--st-error-red);
  }

  .metadata-form-error-message {
    color: var(--st-error-red);
    margin: 0.25rem;
  }
</style>
