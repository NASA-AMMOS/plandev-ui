<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams } from 'ag-grid-community';
  import { filteredExpansionSequences } from '../../stores/expansion';
  import { modelId } from '../../stores/plan';
  import { expandedTemplates, parcels } from '../../stores/sequencing';
  import { simulationDatasetId } from '../../stores/simulation';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ExpandedTemplate } from '../../types/sequencing';
  import effects from '../../utilities/effects';
  import { showEditorModal } from '../../utilities/modal';
  import RowVirtualizerFixed from '../RowVirtualizerFixed.svelte';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';

  export let user: User | null;

  type CellRendererParamsActions = {
    openExpandedTemplate: (expandedTemplate: ExpandedTemplate) => void;
  };
  type CellRendererParams = ICellRendererParams<ExpandedTemplate> & CellRendererParamsActions;

  const baseColumnDefs: DataGridColumnDef[] = [
    {
      field: 'id',
      filter: 'number',
      headerName: 'ID',
      resizable: true,
      sortable: true,
    },
    {
      field: 'filter_id',
      filter: 'number',
      headerName: 'Filter ID',
      resizable: true,
      sortable: true,
    },
    {
      field: 'simulation_dataset_id',
      filter: 'number',
      headerName: 'Simulation Dataset ID',
      resizable: true,
      sortable: true,
    },
    {
      field: 'created_at',
      filter: 'string',
      headerName: 'Created At',
      resizable: true,
      sortable: true,
    },
  ];

  let expandedTemplateDataGrid: DataGrid<ExpandedTemplate>;
  let selectedExpandedTemplateId: number | null = null;
  let columnDefs: DataGridColumnDef[] = baseColumnDefs;
  let selectedParcel: number | null = null;
  let selectedSequence: string | null = null;

  $: columnDefs = [
    ...columnDefs,
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: CellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            rowData: params.data,
            viewCallback: data => user && params.openExpandedTemplate(data),
            viewTooltip: {
              content: 'Open Expanded Template',
              placement: 'bottom',
            },
          },
          target: actionsDiv,
        });
        return actionsDiv;
      },
      cellRendererParams: {
        openExpandedTemplate,
      } as CellRendererParamsActions,
      field: 'actions',
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 20,
    },
  ];

  function openExpandedTemplate(expandedTemplate: ExpandedTemplate) {
    // TODO: fix editor to parse correctly
    showEditorModal(
      expandedTemplate.expanded_template,
      'typescript',
      `Expanded Template ID : ${expandedTemplate.id}`,
      true,
    );
  }

  function handleTemplating() {
    if (selectedSequence !== null && selectedParcel !== null && $plan !== null) {
      // TODO: Support sending multiple sequences
      effects.expandTemplates([selectedSequence], $simulationDatasetLatestId, $plan.model_id, selectedParcel, user);
    }
  }
</script>

<RowVirtualizerFixed />
<div class="sequencing-body">
  <fieldset>
    <label for="sequence" class="sequence-selector"> Sequence </label>
    <select
      bind:value={selectedSequence}
      class="st-select w-100"
      disabled={!$filteredExpansionSequences}
      name="sequence"
    >
      <option value={null} />
      {#each $filteredExpansionSequences as sequence}
        <option value={sequence.seq_id}>
          {sequence.seq_id}
        </option>
      {/each}
    </select>
  </fieldset>
  <fieldset>
    <label for="parcel" class="parcel-selector"> Parcel </label>
    <select bind:value={selectedParcel} class="st-select w-100" disabled={!$parcels} name="parcels">
      <option value={null} />
      {#each $parcels as parcel}
        <option value={parcel.id}>
          {parcel.name} ({parcel.id})
        </option>
      {/each}
    </select>
  </fieldset>
  <fieldset>
    <button class="st-button primary w-100" on:click={handleTemplating}> Run Templating </button>
  </fieldset>
  <hr />
  <div class="expanded-templates-table">
    <span class="st-typography-label">Expanded Sequences</span>
    <SingleActionDataGrid
      bind:dataGrid={expandedTemplateDataGrid}
      bind:selectedItemId={selectedExpandedTemplateId}
      getRowId={rowData => rowData.id}
      {columnDefs}
      itemDisplayText="Expanded Template"
      items={$expandedTemplates}
      scrollToSelection={true}
      {user}
    />
  </div>
</div>

<style>
  .sequencing-body {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .expanded-templates-table {
    height: 33%;
    margin: 16px;
  }
</style>
