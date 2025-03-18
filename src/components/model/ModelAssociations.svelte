<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { DefinitionType } from '../../enums/association';
  import type {
    Association,
    AssociationSpecification,
    AssociationSpecificationMap,
    BaseMetadata,
  } from '../../types/metadata';
  import type { Model } from '../../types/model';
  import type { Argument } from '../../types/parameter';
  import type { RadioButtonId } from '../../types/radio-buttons';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import Loading from '../Loading.svelte';
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
  export let loading: boolean = false;
  export let metadataList: Pick<BaseMetadata, 'id' | 'name' | 'public' | 'versions'>[] = [];
  export let model: Model | null = null;
  export let numOfPrivateAssociations: number = 0;
  export let selectedAssociation: Association = 'constraint';
  export let selectedSpecifications: AssociationSpecificationMap = {};
  export let selectedSpecificationsList: AssociationSpecification[] = [];

  const dispatch = createEventDispatcher<{
    close: void;
    save: void;
    selectAssociation: Association;
    toggleSpecification: { metadataId: number; selected: boolean };
    updateSpecifications: { arguments?: Argument; id: string; priority?: number; revision?: number | null };
  }>();

  let metadataMap: Record<number, BaseMetadata> = {};
  let selectedAssociationId: Association = 'constraint';
  let selectedAssociationTitle = 'Constraint';
  let selectedDefinitionCode: string | null;
  let selectedViewId: RadioButtonId = 'model';
  let selectedDefinition: {
    definitionType: DefinitionType;
    id?: string;
    metadataId: number;
    revision: number | null;
  } | null = null;

  $: {
    metadataMap = metadataList.reduce(
      (prevMap, metadata) => ({
        ...prevMap,
        [metadata.id]: metadata,
      }),
      {},
    );
    if (selectedDefinition && !metadataMap[selectedDefinition.metadataId]) {
      selectedDefinition = null;
    }
  }
  $: if (selectedAssociation) {
    selectedDefinition = null;
  }
  $: if (selectedDefinition) {
    const selectedVersion =
      selectedDefinition.revision !== null
        ? metadataMap[selectedDefinition.metadataId].versions.find(
            ({ revision }) => selectedDefinition?.revision === revision,
          )
        : metadataMap[selectedDefinition.metadataId].versions[0];

    if (selectedVersion) {
      selectedDefinitionCode = selectedVersion.definition;
    }
  } else {
    selectedDefinitionCode = null;
  }
  $: selectedAssociationTitle = `${selectedAssociation.charAt(0).toUpperCase()}${selectedAssociation.slice(1)}`;

  function onClose() {
    dispatch('close');
  }

  function onUpdatePriority(event: CustomEvent<{ id: string; priority: number }>) {
    const {
      detail: { id, priority },
    } = event;
    dispatch('updateSpecifications', {
      id,
      priority,
    });
  }

  function onUpdateRevision(event: CustomEvent<{ arguments: Argument; id: string; revision: number | null }>) {
    const {
      detail: { arguments: argsToUpdate, id, revision },
    } = event;
    dispatch('updateSpecifications', {
      arguments: argsToUpdate,
      id,
      revision,
    });
  }

  function onUpdateArguments(event: CustomEvent<{ arguments: Argument; id: string }>) {
    const {
      detail: { arguments: argsToUpdate, id },
    } = event;
    dispatch('updateSpecifications', {
      arguments: argsToUpdate,
      id,
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

  function onSelectDefinition(
    event: CustomEvent<{
      definitionType: DefinitionType;
      id?: string;
      metadataId: number;
      revision: number | null;
    } | null>,
  ) {
    selectedDefinition = event.detail;
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
          {loading}
          {metadataList}
          metadataType={selectedAssociation}
          selectedMetadata={selectedDefinition}
          {selectedSpecifications}
          on:selectDefinition={onSelectDefinition}
          on:toggleSpecification
          on:newMetadata
          on:viewMetadata
        />
      {:else}
        <div class="association-items-container">
          {#if loading}
            <div class="message">
              <Loading />
            </div>
          {:else if model !== null && selectedSpecificationsList.length > 0}
            <div class="private-label">
              {#if numOfPrivateAssociations > 0}
                {numOfPrivateAssociations}
                {selectedAssociation}{numOfPrivateAssociations !== 1 ? 's' : ''}
                {numOfPrivateAssociations > 1 ? 'are' : 'is'} private and not shown
              {/if}
            </div>
            {#each selectedSpecificationsList as spec, itemIndex (spec.id)}
              {#if selectedSpecifications[spec.metadata_id] && metadataMap[spec.metadata_id]}
                {#if selectedAssociationId === 'goal'}
                  <ModelAssociationsListItem
                    hasEditPermission={hasEditSpecPermission}
                    isSelected={selectedDefinition?.id === spec.id}
                    id={spec.id}
                    invocationArguments={spec.arguments}
                    metadataId={spec.metadata_id}
                    metadataName={metadataMap[spec.metadata_id].name}
                    metadataType={selectedAssociationId}
                    priority={spec.priority}
                    versions={metadataMap[spec.metadata_id].versions}
                    selectedRevision={spec.revision}
                    shouldShowUpButton={(spec?.priority ?? 0) > 0}
                    shouldShowDownButton={itemIndex < selectedSpecificationsList.length - 1}
                    on:updatePriority={onUpdatePriority}
                    on:updateRevision={onUpdateRevision}
                    on:selectDefinition={onSelectDefinition}
                    on:updateArguments={onUpdateArguments}
                    on:duplicateInvocation
                    on:deleteInvocation
                  />
                {:else if selectedAssociationId === 'constraint'}
                  <ModelAssociationsListItem
                    hasEditPermission={hasEditSpecPermission}
                    isSelected={selectedDefinition?.id === spec.id}
                    id={spec.id}
                    invocationArguments={spec.arguments}
                    metadataId={spec.metadata_id}
                    metadataName={metadataMap[spec.metadata_id].name}
                    metadataType={selectedAssociationId}
                    priority={spec?.priority ?? 0}
                    priorityLabel="Order"
                    versions={metadataMap[spec.metadata_id].versions}
                    selectedRevision={spec.revision}
                    shouldShowUpButton={(spec?.priority ?? 0) > 0}
                    shouldShowDownButton={itemIndex < selectedSpecificationsList.length - 1}
                    on:updatePriority={onUpdatePriority}
                    on:updateRevision={onUpdateRevision}
                    on:selectDefinition={onSelectDefinition}
                    on:updateArguments={onUpdateArguments}
                    on:duplicateInvocation
                    on:deleteInvocation
                  />
                {:else}
                  <ModelAssociationsListItem
                    hasEditPermission={hasEditSpecPermission}
                    isSelected={selectedDefinition?.id === spec.id}
                    id={spec.id}
                    metadataId={spec.metadata_id}
                    metadataName={metadataMap[spec.metadata_id].name}
                    metadataType={selectedAssociationId}
                    versions={metadataMap[spec.metadata_id].versions}
                    selectedRevision={spec.revision}
                    on:updateRevision={onUpdateRevision}
                    on:selectDefinition={onSelectDefinition}
                  />
                {/if}
              {/if}
            {/each}
          {:else}
            <div class="message st-typography-body">
              No {selectedAssociationTitle.toLowerCase()}s associated with this model yet.
            </div>
          {/if}
        </div>
      {/if}
    </div>
    <CssGridGutter track={1} type="column" />

    <DefinitionEditor
      referenceModelId={model?.id}
      definition={selectedDefinitionCode ?? `No ${selectedAssociationTitle} Definition Selected`}
      definitionType={selectedDefinition?.definitionType}
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

  .message {
    padding: 0 1rem;
  }

  .private-label {
    color: #e6b300;
    padding: 0 1rem;
  }
</style>
