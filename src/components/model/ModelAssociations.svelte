<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type {
    Association,
    AssociationSpecification,
    AssociationSpecificationMap,
    BaseMetadata,
  } from '../../types/metadata';
  import type { Model } from '../../types/model';
  import type { RadioButtonId } from '../../types/radio-buttons';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import DefinitionEditor from '../ui/Association/DefinitionEditor.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import RadioButton from '../ui/RadioButtons/RadioButton.svelte';
  import RadioButtons from '../ui/RadioButtons/RadioButtons.svelte';
  import ModelAssociationsListItem from './ModelAssociationsListItem.svelte';
  import ModelSpecification from './ModelSpecification.svelte';

  export let hasCreatePermission: boolean = false;
  export let hasEditSpecPermission: boolean = false;
  export let hasModelChanged: boolean = false;
  export let metadataList: Pick<BaseMetadata, 'id' | 'name' | 'public' | 'versions'>[] = [];
  export let model: Model | null = null;
  export let selectedAssociation: Association = 'constraint';
  export let selectedSpecifications: AssociationSpecificationMap = {};

  const dispatch = createEventDispatcher<{
    close: void;
    save: void;
    selectAssociation: Association;
    updateSpecifications: AssociationSpecification;
  }>();

  let metadataMap: Record<number, BaseMetadata> = {};
  let numOfPrivateMetadata: number = 0;
  let selectedAssociationId: Association = 'constraint';
  let selectedAssociationTitle = 'Constraint';
  let selectedDefinition: string | null;
  let selectedViewId: RadioButtonId = 'model';
  let selectedSpecification: { id: number; revision: number | null } | null = null;
  let selectedSpecificationsList: AssociationSpecification[] = [];

  $: {
    metadataMap = metadataList.reduce(
      (prevMap, metadata) => ({
        ...prevMap,
        [metadata.id]: metadata,
      }),
      {},
    );
    if (selectedSpecification && !metadataMap[selectedSpecification.id]) {
      selectedSpecification = null;
    }
  }
  $: if (selectedAssociation) {
    selectedSpecification = null;
  }
  $: if (selectedSpecification) {
    const selectedVersion =
      selectedSpecification.revision !== null
        ? metadataMap[selectedSpecification.id].versions.find(
            ({ revision }) => selectedSpecification?.revision === revision,
          )
        : metadataMap[selectedSpecification.id].versions[0];

    if (selectedVersion) {
      selectedDefinition = selectedVersion.definition;
    }
  } else {
    selectedDefinition = null;
  }
  $: selectedAssociationTitle = `${selectedAssociation.charAt(0).toUpperCase()}${selectedAssociation.slice(1)}`;
  $: selectedSpecificationsList = Object.keys(selectedSpecifications)
    .map(id => {
      const specId = parseInt(id);
      return {
        ...selectedSpecifications[specId],
        id: specId,
      };
    })
    .filter(({ selected }) => selected)
    .sort((specA, specB) => {
      if (specA.priority !== undefined && specB.priority !== undefined && specA.priority !== specB.priority) {
        return specA.priority - specB.priority;
      }

      return specA.id - specB.id;
    });
  $: numOfPrivateMetadata = selectedSpecificationsList.filter(({ id }) => !metadataMap[id]).length;

  function onClose() {
    dispatch('close');
  }

  function onUpdatePriority(event: CustomEvent<{ id: number; priority: number }>) {
    const {
      detail: { id, priority },
    } = event;
    dispatch('updateSpecifications', {
      ...selectedSpecifications[id],
      id,
      priority,
    });
  }

  function onUpdateRevision(event: CustomEvent<{ id: number; revision: number | null }>) {
    const {
      detail: { id, revision },
    } = event;
    dispatch('updateSpecifications', {
      ...selectedSpecifications[id],
      id,
      revision,
    });
  }

  function onSave() {
    dispatch('save');
  }

  function onSelectAssociation(event: CustomEvent<{ id: RadioButtonId }>) {
    const {
      detail: { id },
    } = event;
    selectedAssociationId = id as Association;
    dispatch('selectAssociation', id as Association);
  }

  function onSelectSpecification(
    event: CustomEvent<{
      id: number;
      revision: number | null;
    } | null>,
  ) {
    selectedSpecification = event.detail;
  }

  function onSelectView(event: CustomEvent<{ id: RadioButtonId }>) {
    const {
      detail: { id },
    } = event;
    selectedViewId = id;
  }
</script>

<div class="associations-container">
  <div class="associations-header">
    <div class="associations-title">Associations</div>
    <RadioButtons selectedButtonId={selectedAssociationId} on:select-radio-button={onSelectAssociation}>
      <RadioButton id="constraint"><div class="association-button">Constraints</div></RadioButton>
      <RadioButton id="goal"><div class="association-button">Goals</div></RadioButton>
      <RadioButton id="condition"><div class="association-button">Conditions</div></RadioButton>
    </RadioButtons>
    <div class="action-buttons">
      <button class="st-button secondary w-100" on:click={onClose}> Close </button>
      <button
        class="st-button w-100"
        disabled={!hasModelChanged}
        on:click={onSave}
        use:permissionHandler={{
          hasPermission: hasEditSpecPermission,
          permissionError: 'You do not have permission to update this model.',
        }}
      >
        {hasModelChanged ? 'Save' : 'Saved'}
      </button>
    </div>
  </div>
  <CssGrid class="associations-css-grid" columns="1fr 3px 1fr">
    <div class="associations-content">
      <div class="associations-view">
        <RadioButtons selectedButtonId={selectedViewId} on:select-radio-button={onSelectView}>
          <RadioButton id="model"><div class="association-button">Model</div></RadioButton>
          <RadioButton id="library"><div class="association-button">Library</div></RadioButton>
        </RadioButtons>
      </div>
      {#if selectedViewId === 'library'}
        <ModelSpecification
          {hasCreatePermission}
          {hasEditSpecPermission}
          {metadataList}
          metadataType={selectedAssociation}
          {selectedSpecification}
          {selectedSpecifications}
          on:selectSpecification={onSelectSpecification}
          on:toggleSpecification
          on:newMetadata
          on:viewMetadata
        />
      {:else}
        <div class="association-items-container">
          {#if model !== null && selectedSpecificationsList.length > 0}
            <div class="private-label">
              {#if numOfPrivateMetadata > 0}
                {numOfPrivateMetadata}
                {selectedAssociation}{numOfPrivateMetadata !== 1 ? 's' : ''}
                {numOfPrivateMetadata > 1 ? 'are' : 'is'} private and not shown
              {/if}
            </div>
            {#each selectedSpecificationsList as spec}
              {#if spec.selected && metadataMap[spec.id]}
                {#if selectedAssociationId === 'goal'}
                  <ModelAssociationsListItem
                    hasEditPermission={hasEditSpecPermission}
                    isSelected={selectedSpecification?.id === spec.id}
                    metadataId={spec.id}
                    metadataName={metadataMap[spec.id].name}
                    metadataType={selectedAssociationId}
                    priority={selectedSpecifications[spec.id]?.priority}
                    revisions={metadataMap[spec.id].versions.map(({ revision }) => revision)}
                    selectedRevision={selectedSpecifications[spec.id].revision}
                    on:updatePriority={onUpdatePriority}
                    on:updateRevision={onUpdateRevision}
                    on:selectSpecification={onSelectSpecification}
                  />
                {:else}
                  <ModelAssociationsListItem
                    hasEditPermission={hasEditSpecPermission}
                    isSelected={selectedSpecification?.id === spec.id}
                    metadataId={spec.id}
                    metadataName={metadataMap[spec.id].name}
                    metadataType={selectedAssociationId}
                    revisions={metadataMap[spec.id].versions.map(({ revision }) => revision)}
                    selectedRevision={selectedSpecifications[spec.id].revision}
                    on:updateRevision={onUpdateRevision}
                    on:selectSpecification={onSelectSpecification}
                  />
                {/if}
              {/if}
            {/each}
          {:else}
            <div class="empty-associations">
              No {selectedAssociationTitle.toLowerCase()}s associated with this model yet.
            </div>
          {/if}
        </div>
      {/if}
    </div>
    <CssGridGutter track={1} type="column" />

    <DefinitionEditor
      referenceModelId={model?.id}
      definition={selectedDefinition ?? `No ${selectedAssociationTitle} Definition Selected`}
      readOnly={true}
      title={`${selectedAssociationTitle} - Definition Editor (Read-only)`}
    />
  </CssGrid>
</div>

<style>
  .associations-container {
    display: grid;
    grid-template-rows: min-content auto;
    overflow: hidden;
    position: relative;
    width: 100%;
  }

  .associations-header {
    align-items: center;
    border-bottom: 1px solid var(--st-gray-20);
    column-gap: 2rem;
    display: grid;
    grid-template-columns: min-content min-content auto;
    height: var(--nav-header-height);
  }

  .associations-header .action-buttons {
    column-gap: 8px;
    display: grid;
    grid-template-columns: min-content min-content;
    justify-content: right;
    padding-right: 8px;
  }

  .associations-title {
    padding: 8px;
  }

  .association-button {
    padding-left: 16px;
    padding-right: 16px;
  }

  .associations-container :global(.associations-css-grid) {
    overflow: hidden;
  }

  .associations-content {
    display: grid;
    grid-template-rows: min-content auto;
    min-width: 300px;
    overflow: hidden;
  }

  .associations-view {
    padding: 8px;
    width: 200px;
  }

  .association-items-container {
    margin-top: 1rem;
    overflow-y: auto;
    padding-bottom: 1rem;
  }

  .empty-associations {
    padding: 0 1rem;
  }

  .private-label {
    color: #e6b300;
    padding: 0 1rem;
  }
</style>
