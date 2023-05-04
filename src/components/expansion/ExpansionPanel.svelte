<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams } from 'ag-grid-community';
  import {
    creatingExpansionSequence,
    expansionSets,
    filteredExpansionSequences,
    planExpansionStatus,
    selectedExpansionSetId,
  } from '../../stores/expansion';
  import { simulationDatasetId } from '../../stores/simulation';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ExpansionSequence } from '../../types/expansion';
  import type { ViewGridSection } from '../../types/view';
  import effects from '../../utilities/effects';
  import { showExpansionSequenceModal } from '../../utilities/modal';
  import Collapse from '../Collapse.svelte';
  import Input from '../form/Input.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import PanelHeaderActionButton from '../ui/PanelHeaderActionButton.svelte';
  import PanelHeaderActions from '../ui/PanelHeaderActions.svelte';

  export let gridSection: ViewGridSection;

  type CellRendererParams = {
    deleteExpansionSequence: (sequence: ExpansionSequence) => void;
    openExpansionSequence: (sequence: ExpansionSequence) => void;
  };
  type ExpansionSequenceCellRendererParams = ICellRendererParams<ExpansionSequence> & CellRendererParams;

  const columnDefs: DataGridColumnDef[] = [
    {
      field: 'seq_id',
      filter: 'text',
      headerName: 'Seq ID',
      resizable: true,
      sortable: true,
      suppressSizeToFit: true,
      width: 85,
    },
    {
      field: 'simulation_dataset_id',
      filter: 'number',
      headerName: 'Simulation ID',
      resizable: true,
      sortable: true,
    },
    { field: 'created_at', filter: 'text', headerName: 'Created At', resizable: true, sortable: true },
    { field: 'updated_at', filter: 'text', headerName: 'Updated At', resizable: true, sortable: true },
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: ExpansionSequenceCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteExpansionSequence,
            deleteTooltip: {
              content: 'Delete Sequence',
              placement: 'bottom',
            },
            rowData: params.data,
            viewCallback: params.openExpansionSequence,
            viewTooltip: {
              content: 'Open Sequence',
              placement: 'bottom',
            },
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteExpansionSequence,
        openExpansionSequence: showExpansionSequenceModal,
      } as CellRendererParams,
      field: 'actions',
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 55,
    },
  ];

  let createButtonEnabled: boolean = false;
  let expandButtonEnabled: boolean = false;
  let seqIdInput: string = '';

  $: createButtonEnabled = seqIdInput !== '';
  $: expandButtonEnabled = $selectedExpansionSetId !== null;

  function deleteExpansionSequence(sequence: ExpansionSequence) {
    effects.deleteExpansionSequence(sequence);
  }

  function deleteExpansionSequenceContext(event: CustomEvent<string[]>) {
    const selectedSequenceId = event.detail[0];

    const sequenceToDelete = $filteredExpansionSequences.find((sequence: ExpansionSequence) => {
      return sequence.seq_id === selectedSequenceId;
    });

    if (sequenceToDelete) {
      deleteExpansionSequence(sequenceToDelete);
    }
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Expansion" />
    <PanelHeaderActions status={$planExpansionStatus}>
      <PanelHeaderActionButton
        title="Expand"
        showLabel
        disabled={$selectedExpansionSetId === null}
        on:click={() => effects.expand($selectedExpansionSetId, $simulationDatasetId)}
      />
    </PanelHeaderActions>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <div class="expansion-panel-body">
      <fieldset>
        <label for="expansionSet">Expansion Set</label>
        <select
          bind:value={$selectedExpansionSetId}
          class="st-select w-100"
          disabled={!$expansionSets.length}
          name="expansionSet"
        >
          {#if !$expansionSets.length}
            <option value={null}>No Expansion Sets Found</option>
          {:else}
            <option value={null} />
            {#each $expansionSets as set}
              <option value={set.id}>
                Expansion Set {set.id}
              </option>
            {/each}
          {/if}
        </select>
      </fieldset>

      <fieldset>
        <Collapse className="details-container" title="Sequences">
          <Input>
            <label for="simulationDatasetId">Simulation Dataset ID</label>
            <input class="st-input w-100" disabled name="simulationDatasetId" value={$simulationDatasetId ?? 'None'} />
          </Input>

          {#if $simulationDatasetId === null}
            <div class="pb-3">First run a simulation before creating a sequence</div>
          {:else}
            <div class="expansion-form-container">
              <CssGrid class="expansion-form" rows="min-content auto">
                <CssGrid columns="3fr 1fr" gap="10px">
                  <input bind:value={seqIdInput} class="st-input" />
                  <button
                    class="st-button secondary"
                    disabled={!createButtonEnabled}
                    on:click|stopPropagation={() => effects.createExpansionSequence(seqIdInput, $simulationDatasetId)}
                  >
                    {$creatingExpansionSequence ? 'Creating... ' : 'Create'}
                  </button>
                </CssGrid>
                <div class="mt-2">
                  {#if $filteredExpansionSequences.length}
                    <SingleActionDataGrid
                      getRowId={rowData => rowData.seq_id}
                      {columnDefs}
                      itemDisplayText="Sequence"
                      items={$filteredExpansionSequences}
                      on:deleteItem={deleteExpansionSequenceContext}
                      on:rowDoubleClicked={event => showExpansionSequenceModal(event.detail)}
                    />
                  {:else}
                    <div class="st-typography-label">
                      No Sequences for Simulation Dataset {$simulationDatasetId ?? ''}
                    </div>
                  {/if}
                </div>
              </CssGrid>
            </div>
          {/if}
        </Collapse>
      </fieldset>
    </div>
  </svelte:fragment>
</Panel>

<style>
  .expansion-panel-body {
    display: grid;
    grid-template-rows: min-content auto;
    height: 100%;
  }

  :global(.details-container) {
    height: 100%;
  }
  :global(.details-container.collapse .content) {
    height: calc(100%);
  }

  :global(.details-container.collapse .expansion-form-container) {
    height: calc(100% - 48px);
  }

  :global(.expansion-form) {
    height: 100%;
  }
</style>
