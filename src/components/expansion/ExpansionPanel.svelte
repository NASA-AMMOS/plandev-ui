<svelte:options immutable={true} />

<script lang="ts">
  import { Button, DropdownMenu } from '@nasa-jpl/stellar-svelte';
  import FilterIcon from '@nasa-jpl/stellar/icons/filter.svg?component';
  import PlayIcon from '@nasa-jpl/stellar/icons/play.svg?component';
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import CodeSquareIcon from 'bootstrap-icons/icons/code-square.svg?component';
  import DownloadIcon from 'bootstrap-icons/icons/download.svg?component';
  import JournalCodeIcon from 'bootstrap-icons/icons/journal-code.svg?component';
  import { SEQUENCE_EXPANSION_MODE } from '../../constants/command-expansion';
  import { SequencingMode } from '../../enums/sequencing';
  import { expansionSequences, expansionSets, filteredExpansionSequences } from '../../stores/expansion';
  import { plan } from '../../stores/plan';
  import { expandedTemplates } from '../../stores/sequence-template';
  import { sequenceFilters } from '../../stores/sequencing';
  import { simulationDatasetLatest, simulationDatasetsPlan } from '../../stores/simulation';
  import type { User } from '../../types/app';
  import type { ExpansionSequence, SequenceFilter } from '../../types/expansion';
  import type { ActivityLayerFilter } from '../../types/timeline';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { downloadBlob, downloadJSON } from '../../utilities/generic';
  import { showExpansionSequenceModal, showNewSequenceModal } from '../../utilities/modal';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { featurePermissions } from '../../utilities/permissions';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import ModalFooter from '../modals/ModalFooter.svelte';
  import ActivityFilterBuilder from '../timeline/form/TimelineEditor/ActivityFilterBuilder.svelte';
  import ListItem from '../ui/ListItem.svelte';
  import Panel from '../ui/Panel.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  const deletePermissionSequenceError: string = 'You do not have permission to delete an expansion sequence.';
  const deletePermissionSequenceFilterError: string = 'You do not have permission to delete a sequence filter';

  let filterText: string;
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
        effects.expandTemplates([sequence.seq_id], sequence.simulation_dataset_id, $plan, user);
      } else if (selectedExpansionSetId !== null && $plan !== null) {
        effects.expand(selectedExpansionSetId, sequence.simulation_dataset_id, $plan, user);
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

  async function onDownloadExpandedSequence(sequence: ExpansionSequence) {
    let outputStr: string | null;
    let outputName: string = `${sequence.seq_id}_${sequence.simulation_dataset_id}`;
    if (SEQUENCE_EXPANSION_MODE === SequencingMode.TEMPLATING) {
      const expandedTemplate = $expandedTemplates.find(expandedTemplate => expandedTemplate.seq_id === sequence.seq_id);
      outputStr = expandedTemplate?.expanded_template ?? `No output found for sequence "${sequence.seq_id}"'`;
      downloadBlob(new Blob([outputStr], { type: 'text/plain' }), `${outputName}.txt`);
    } else {
      outputStr = await effects.getExpansionSequenceSeqJson(sequence.seq_id, sequence.simulation_dataset_id, user);
      if (outputStr) {
        downloadJSON(JSON.parse(outputStr), `${outputName}.json`);
      }
    }
  }

  function onExpandSequence(sequence: ExpansionSequence) {
    if ($simulationDatasetLatest !== null && $plan !== null) {
      if (SEQUENCE_EXPANSION_MODE === SequencingMode.TEMPLATING) {
        effects.expandTemplates([sequence.seq_id], $simulationDatasetLatest.id, $plan, user);
      } else if (selectedExpansionSetId !== null) {
        effects.expand(selectedExpansionSetId, $simulationDatasetLatest.id, $plan, user);
      }
    }
  }

  async function onSendExpandedSequenceToWorkspace(sequence: ExpansionSequence) {
    let expandedResult: string | null;
    if (SEQUENCE_EXPANSION_MODE === SequencingMode.TEMPLATING) {
      const expandedTemplate = $expandedTemplates.find(expandedTemplate => expandedTemplate.seq_id === sequence.seq_id);
      expandedResult = expandedTemplate?.expanded_template ?? `No output found for sequence "${sequence.seq_id}"'`;
    } else {
      expandedResult = await effects.getExpansionSequenceSeqJson(sequence.seq_id, sequence.simulation_dataset_id, user);
    }

    if (expandedResult !== null) {
      // TODO: remove this after expansion runs are made to work in new workspaces
      // await effects.sendSequenceToWorkspace(sequence, expandedResult, user);
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
          <select name="expansionSetId" bind:value={selectedExpansionSetId} class="st-select w-full">
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
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild let:builder>
            <Button variant="outline" builders={[builder]}>New</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class="w-56" align="start">
            <DropdownMenu.Label size="sm">Create new...</DropdownMenu.Label>
            <DropdownMenu.Item size="sm" on:click={onShowSequenceCreate}>Sequence</DropdownMenu.Item>
            <DropdownMenu.Item size="sm" on:click={onShowFilterCreate}>Sequence Filter</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <button
          class="st-button secondary expand-all-button"
          disabled={isExpansionDisabled}
          on:click|stopPropagation={onExpandAll}
        >
          Expand All
        </button>
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
              <div use:tooltip={{ content: 'Send Expanded Sequence To Workspace', placement: 'top' }}>
                <button
                  aria-label={`Send '${sequenceOrFilter.seq_id}' To Workspace`}
                  class="st-button icon"
                  on:click|stopPropagation={() => {
                    if (isExpansionSequence(sequenceOrFilter)) {
                      onSendExpandedSequenceToWorkspace(sequenceOrFilter);
                    }
                  }}
                >
                  <CodeSquareIcon />
                </button>
              </div>
              <div use:tooltip={{ content: 'Download Expanded Sequence', placement: 'top' }}>
                <button
                  aria-label={`Download Expanded Sequence '${sequenceOrFilter.seq_id}'`}
                  class="st-button icon"
                  on:click|stopPropagation={() => {
                    if (isExpansionSequence(sequenceOrFilter)) {
                      onDownloadExpandedSequence(sequenceOrFilter);
                    }
                  }}
                >
                  <DownloadIcon />
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

  .sne-item :global(svg) {
    flex-shrink: 0;
  }

  .expand-all-button {
    gap: 4px;
    position: relative;
    z-index: 1;
  }
</style>
