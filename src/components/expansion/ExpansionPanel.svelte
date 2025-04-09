<svelte:options immutable={true} />

<script lang="ts">
  import FilterIcon from '@nasa-jpl/stellar/icons/filter.svg?component';
  import PlayIcon from '@nasa-jpl/stellar/icons/play.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import JournalCodeIcon from 'bootstrap-icons/icons/journal-code.svg?component';
  import { SEQUENCE_EXPANSION_MODE } from '../../constants/command-expansion';
  import { SequencingMode } from '../../enums/sequencing';
  import { expansionSequences, expansionSets, filteredExpansionSequences } from '../../stores/expansion';
  import { plan } from '../../stores/plan';
  import { sequenceFilters } from '../../stores/sequencing';
  import { simulationDatasetLatest, simulationDatasetsPlan } from '../../stores/simulation';
  import type { User } from '../../types/app';
  import type { ExpansionSequence, SequenceFilter } from '../../types/expansion';
  import type { ActivityLayerFilter } from '../../types/timeline';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { showExpansionSequenceModal, showNewSequenceModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { tooltip } from '../../utilities/tooltip';
  import ContextMenu from '../context-menu/ContextMenu.svelte';
  import ContextMenuHeader from '../context-menu/ContextMenuHeader.svelte';
  import ContextMenuItem from '../context-menu/ContextMenuItem.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import ModalFooter from '../modals/ModalFooter.svelte';
  import ActivityFilterBuilder from '../timeline/form/TimelineEditor/ActivityFilterBuilder.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import Panel from '../ui/Panel.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  const deletePermissionSequenceError: string = 'You do not have permission to delete an expansion sequence.';
  const deletePermissionSequenceFilterError: string = 'You do not have permission to delete a sequence filter';

  let contextMenu: ContextMenu;
  let filterText: string;
  let newButton: HTMLElement;
  let sequencesAndFilters: (ExpansionSequence | SequenceFilter)[] = [];
  let isExpansionDisabled: boolean = true;

  let selectedExpansionSetId: number | null = null;
  let relevantSimulationDatasetIds: number[] | undefined = [];
  let relevantExpansionSequences: ExpansionSequence[] = [];

  let filterMenu: ActivityFilterBuilder;
  let activeSequenceFilterName: string;
  let activeSequenceFilterId: number | null = null;
  let filterMenuActiveFilter: ActivityLayerFilter;
  let creatingNewSequenceFilter: boolean = false;

  let hasDeletePermissionSequence: boolean = false;
  let hasDeletePermissionSequenceFilter: boolean = false;

  $: if (user !== null && $plan !== null) {
    hasDeletePermissionSequence = featurePermissions.expansionSequences.canDelete(user, $plan);
    hasDeletePermissionSequenceFilter = featurePermissions.sequenceFilter.canDelete(user, $plan.model);
  }

  $: relevantSimulationDatasetIds = $simulationDatasetsPlan?.map(dataset => dataset.id);

  $: relevantExpansionSequences = $expansionSequences.filter(sequence =>
    relevantSimulationDatasetIds?.includes(sequence.simulation_dataset_id),
  );

  $: sequencesAndFilters = [...relevantExpansionSequences, ...$sequenceFilters];

  $: isExpansionDisabled =
    $simulationDatasetLatest && relevantExpansionSequences.length > 0
      ? SEQUENCE_EXPANSION_MODE === SequencingMode.TEMPLATING
        ? false
        : selectedExpansionSetId === null
      : true;

  function toggleContextMenu(e: MouseEvent) {
    const { x, y } = newButton.getBoundingClientRect();
    const newEvent = new MouseEvent(e.type, { ...e, clientX: x, clientY: y });
    contextMenu.show(newEvent);
  }

  function onApplyFilter(sequenceFilter: SequenceFilter) {
    if ($simulationDatasetLatest !== null && $plan !== null) {
      effects.applyActivitiesByFilter(
        sequenceFilter,
        $simulationDatasetLatest.id,
        $plan.id,
        $plan.start_time_doy,
        $plan.end_time_doy,
        user,
      );
    }
  }

  function onCreateSequenceFilter() {
    if ($plan !== null) {
      creatingNewSequenceFilter = false;
      effects.createSequenceFilter(
        filterMenuActiveFilter as ActivityLayerFilter,
        activeSequenceFilterName,
        $plan.model_id,
        user,
      );
      filterMenu.toggle();
    }
  }

  function onExpandAll() {
    const useTemplating = SEQUENCE_EXPANSION_MODE === SequencingMode.TEMPLATING;
    $filteredExpansionSequences.forEach(sequence => {
      if (useTemplating && $plan !== null) {
        effects.expandTemplates([sequence.seq_id], sequence.simulation_dataset_id, $plan.model_id, user);
      } else if (selectedExpansionSetId !== null && $plan !== null) {
        effects.expand(selectedExpansionSetId, sequence.simulation_dataset_id, $plan, $plan.model, user);
      }
    });
  }

  function onUpdateSequenceFilter() {
    if ($plan !== null && activeSequenceFilterId !== null) {
      creatingNewSequenceFilter = false;
      effects.updateSequenceFilter(
        filterMenuActiveFilter as ActivityLayerFilter,
        activeSequenceFilterName,
        activeSequenceFilterId,
        $plan.model,
        user,
      );
      filterMenu.toggle();
    }
  }

  function onDeleteSequence(sequence: ExpansionSequence) {
    effects.deleteExpansionSequence(sequence, user);
  }

  function onDeleteSequenceFilter(sequenceFilter: SequenceFilter) {
    effects.deleteSequenceFilters([sequenceFilter.id], user);
  }

  function onExpandSequence(sequence: ExpansionSequence) {
    if ($simulationDatasetLatest !== null && $plan !== null) {
      if (SEQUENCE_EXPANSION_MODE === SequencingMode.TEMPLATING) {
        effects.expandTemplates([sequence.seq_id], $simulationDatasetLatest.id, $plan.model_id, user);
      } else if (selectedExpansionSetId !== null) {
        effects.expand(selectedExpansionSetId, $simulationDatasetLatest.id, $plan, $plan.model, user);
      }
    }
  }

  function onShowExpandedSequence(sequence: ExpansionSequence) {
    showExpansionSequenceModal(sequence, user);
  }

  function onShowFilter(sequenceFilter: SequenceFilter) {
    creatingNewSequenceFilter = false;
    activeSequenceFilterName = sequenceFilter.name;
    activeSequenceFilterId = sequenceFilter.id;
    filterMenu.setActiveFilter(sequenceFilter.filter);
    filterMenu.toggle();
  }

  async function onShowSequenceCreate() {
    const result = await showNewSequenceModal();
    if (result.confirm && result.value !== undefined && $simulationDatasetLatest !== null) {
      effects.createExpansionSequence(result.value.newSequenceName, $simulationDatasetLatest?.id, user);
    }
  }

  function onShowFilterCreate() {
    creatingNewSequenceFilter = true;
    filterMenu.setActiveFilter({});
    filterMenu.toggle();
  }

  function isExpansionSequence(item: ExpansionSequence | SequenceFilter): item is ExpansionSequence {
    return 'seq_id' in item;
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Expansion" />
  </svelte:fragment>

  <svelte:fragment slot="body">
    <ActivityFilterBuilder
      layerName={activeSequenceFilterName}
      bind:this={filterMenu}
      on:rename={newName => {
        activeSequenceFilterName = newName.detail.name;
      }}
      on:filterChange={filter => {
        filterMenuActiveFilter = filter.detail.filter;
      }}
      on:visibilityChange={visibility => {
        if (!visibility.detail.isShown) {
          activeSequenceFilterId = null;
          activeSequenceFilterName = '';
        }
      }}
    >
      <svelte:fragment slot="footer">
        {#if creatingNewSequenceFilter}
          <ModalFooter>
            <button class="st-button primary" on:click={onCreateSequenceFilter}>Create Sequence Filter</button>
          </ModalFooter>
        {:else}
          <ModalFooter>
            <button class="st-button secondary" on:click={onUpdateSequenceFilter}>Update Sequence Filter</button>
          </ModalFooter>
        {/if}
      </svelte:fragment>
    </ActivityFilterBuilder>
    <div class="sne-controls">
      <div class="sne-filter">
        <input
          bind:value={filterText}
          class="st-input"
          name="search"
          autocomplete="off"
          placeholder="Filter..."
          aria-label="Filter..."
        />
      </div>
      {#if SEQUENCE_EXPANSION_MODE === SequencingMode.TYPESCRIPT}
        <div class="sne-expansion-set-select">
          <select name="expansionSetId" bind:value={selectedExpansionSetId} class="st-select w-100">
            {#if !$expansionSets.length}
              <option value={null}>No Expansion Sets</option>
            {:else}
              <option value={null} disabled hidden>Expansion Set</option>
              {#each $expansionSets as expansionSet}
                <option value={expansionSet.id}>
                  {expansionSet.name} ({expansionSet.id})
                </option>
              {/each}
            {/if}
          </select>
        </div>
      {/if}
      <div class="sne-buttons">
        <button
          class="st-button secondary new-button"
          bind:this={newButton}
          on:click|stopPropagation={toggleContextMenu}
        >
          New
        </button>
        <button
          class="st-button secondary expand-all-button"
          disabled={isExpansionDisabled}
          on:click|stopPropagation={onExpandAll}
        >
          Expand All
        </button>
        <ContextMenu bind:this={contextMenu}>
          <ContextMenuHeader>Create new...</ContextMenuHeader>
          <ContextMenuItem on:click={onShowSequenceCreate}>Sequence</ContextMenuItem>
          <ContextMenuItem on:click={onShowFilterCreate}>Sequence Filter</ContextMenuItem>
        </ContextMenu>
      </div>
    </div>
    <div class="sne-items">
      {#each sequencesAndFilters as sequenceOrFilter}
        {#if isExpansionSequence(sequenceOrFilter)}
          <ListItem>
            <span slot="prefix" class="sne-item">
              <JournalCodeIcon />
              {sequenceOrFilter.seq_id}
            </span>
            <span slot="suffix">
              <div use:tooltip={{ content: 'Delete Sequence', placement: 'top' }}>
                <button
                  aria-label={`Delete '${sequenceOrFilter.seq_id}'`}
                  class="st-button icon"
                  on:click|stopPropagation={() => {
                    if (isExpansionSequence(sequenceOrFilter)) {
                      onDeleteSequence(sequenceOrFilter);
                    }
                  }}
                  use:permissionHandler={{
                    hasPermission: hasDeletePermissionSequence,
                    permissionError: deletePermissionSequenceError,
                  }}
                >
                  <TrashIcon />
                </button>
              </div>
              <div use:tooltip={{ content: 'Show Expanded Sequence', placement: 'top' }}>
                <button
                  aria-label={`Show Expanded '${sequenceOrFilter.seq_id}'`}
                  class="st-button icon"
                  on:click|stopPropagation={() => {
                    if (isExpansionSequence(sequenceOrFilter)) {
                      onShowExpandedSequence(sequenceOrFilter);
                    }
                  }}
                >
                  <JournalCodeIcon />
                </button>
              </div>
              <div use:tooltip={{ content: 'Expand Sequence', placement: 'top' }}>
                <button
                  aria-label={`Expand '${sequenceOrFilter.seq_id}'`}
                  class="st-button icon"
                  disabled={isExpansionDisabled}
                  on:click|stopPropagation={() => {
                    if (isExpansionSequence(sequenceOrFilter)) {
                      onExpandSequence(sequenceOrFilter);
                    }
                  }}
                >
                  <PlayIcon />
                </button>
              </div>
            </span>
          </ListItem>
        {:else}
          <ListItem>
            <span slot="prefix" class="sne-item">
              <FilterIcon />
              {sequenceOrFilter.name}
            </span>
            <span slot="suffix">
              <div use:tooltip={{ content: 'Delete Filter', placement: 'top' }}>
                <button
                  aria-label={`Delete '${sequenceOrFilter.name}'`}
                  class="st-button icon"
                  on:click|stopPropagation={() => {
                    if (!isExpansionSequence(sequenceOrFilter)) {
                      onDeleteSequenceFilter(sequenceOrFilter);
                    }
                  }}
                  use:permissionHandler={{
                    hasPermission: hasDeletePermissionSequenceFilter,
                    permissionError: deletePermissionSequenceFilterError,
                  }}
                >
                  <TrashIcon />
                </button>
              </div>
              <div use:tooltip={{ content: 'Show Filter', placement: 'top' }}>
                <button
                  aria-label={`Show '${sequenceOrFilter.name}'`}
                  class="st-button icon"
                  on:click|stopPropagation={() => {
                    if (!isExpansionSequence(sequenceOrFilter)) {
                      onShowFilter(sequenceOrFilter);
                    }
                  }}
                >
                  <FilterIcon />
                </button>
              </div>
              <div use:tooltip={{ content: 'Apply Filter', placement: 'top' }}>
                <button
                  disabled={!$simulationDatasetLatest}
                  aria-label={`Apply '${sequenceOrFilter.name}'`}
                  class="st-button icon"
                  on:click|stopPropagation={() => {
                    if (!isExpansionSequence(sequenceOrFilter)) {
                      onApplyFilter(sequenceOrFilter);
                    }
                  }}
                >
                  <PlayIcon />
                </button>
              </div>
            </span>
          </ListItem>
        {/if}
      {/each}
    </div>
  </svelte:fragment>
</Panel>

<style>
  .sne-controls {
    align-items: center;
    background: rgba(248, 248, 248, 0.6);
    display: flex;
    gap: 8px;
    padding: 8px 8px;
  }

  .sne-controls :global(.st-input) {
    flex: 1;
  }

  :global(.sne-item) {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .new-button {
    gap: 4px;
    position: relative;
    z-index: 1;
  }

  .expand-all-button {
    gap: 4px;
    position: relative;
    z-index: 1;
  }
</style>
