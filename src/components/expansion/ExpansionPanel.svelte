<svelte:options immutable={true} />

<script lang="ts">
  import {
    creatingExpansionSequence,
    expandingPlan,
    expansionSets,
    filteredExpansionSequences,
  } from '../../stores/expansion';
  import { simulationDatasetId } from '../../stores/simulation';
  import effects from '../../utilities/effects';
  import { showExpansionSequenceModal } from '../../utilities/modal';
  import GridMenu from '../menus/GridMenu.svelte';
  import CssGrid from '../ui/CssGrid.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import Panel from '../ui/Panel.svelte';

  export let gridId: number;

  type CellRendererParams = {
    deleteExpansionSequence: (sequence: ExpansionSequence) => void;
  };
  type ExpansionSequenceCellRendererParams = ICellRendererParams<ExpansionSequence> & CellRendererParams;

  const columnDefs: DataGridColumnDef[] = [
    {
      field: 'simulation_dataset_id',
      filter: 'number',
      headerName: 'Simulation ID',
      resizable: true,
      sortable: true,
    },
    {
      field: 'seq_id',
      filter: 'text',
      headerName: 'Seq ID',
      resizable: true,
      sortable: true,
      suppressSizeToFit: true,
      width: 85,
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
          },
          target: actionsDiv,
        });

        return actionsDiv;
      },
      cellRendererParams: {
        deleteExpansionSequence,
      } as CellRendererParams,
      field: 'actions',
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 25,
    },
  ];

  let createButtonEnabled: boolean = false;
  let expandButtonEnabled: boolean = false;
  let selectedExpansionSetId: number | null = null;
  let seqIdInput: string = '';

  $: createButtonEnabled = seqIdInput !== '';
  $: expandButtonEnabled = selectedExpansionSetId !== null;

  function deleteExpansionSequence(sequence: ExpansionSequence) {
    effects.deleteExpansionSequence(sequence);
  }
</script>

<Panel>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Expansion" />
    <div class="right">
      <button
        class="st-button secondary ellipsis"
        disabled={!expandButtonEnabled}
        on:click|stopPropagation={() => effects.expand(selectedExpansionSetId, $simulationDatasetId)}
      >
        {$expandingPlan ? 'Expanding... ' : 'Expand'}
      </button>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <div class="expansion-panel-body">
      <fieldset>
        <label for="expansionSet">Expansion Set</label>
        <select
          bind:value={selectedExpansionSetId}
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
        <details class="details-container" open style:cursor="pointer">
          <summary class="details-label">Sequences</summary>
          <div class="details-body">
            <div class="pt-2 pb-3">
              <label for="simulationDatasetId">Simulation Dataset ID</label>
              <input
                class="st-input w-100"
                disabled
                name="simulationDatasetId"
                value={$simulationDatasetId ?? 'None'}
              />
            </div>

            <div>
              {#if $simulationDatasetId === null}
                <div class="pb-3">First run a simulation before creating a sequence</div>
              {:else}
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
                      <DataGrid
                        getRowId={rowData => rowData.seq_id}
                        {columnDefs}
                        rowData={$filteredExpansionSequences}
                        rowSelection="single"
                        on:rowSelected={({ detail }) => showExpansionSequenceModal(detail.data)}
                      />
                    {:else}
                      <div class="st-typography-label">
                        No Sequences for Simulation Dataset {$simulationDatasetId ?? ''}
                      </div>
                    {/if}
                  </div>
                </CssGrid>
              {/if}
            </div>
          </div>
        </details>
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

  .details-container {
    height: 100%;
  }

  .details-container .details-label {
    height: 18px;
  }

  .details-body {
    display: grid;
    grid-template-rows: min-content auto;
    height: calc(100% - 18px);
  }

  .expansion-panel-body .details-container .details-body :global(.expansion-form) {
    height: 100%;
  }
</style>
