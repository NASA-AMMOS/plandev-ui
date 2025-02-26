<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams } from "ag-grid-community";
  import type { User } from "../../types/app";
  import type { DataGridColumnDef, DataGridRowDoubleClick } from "../../types/data-grid";
  import type { SequenceActivityFilter, SequenceFilter } from "../../types/sequencing";
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import RowVirtualizerFixed from "../RowVirtualizerFixed.svelte";
  import BulkActionDataGrid from "../ui/DataGrid/BulkActionDataGrid.svelte";
  import { showEditorModal } from "../../utilities/modal";
  import effects from "../../utilities/effects";
  import { featurePermissions } from "../../utilities/permissions";
  import { plan } from "../../stores/plan";
  import { sequenceFilters, sequencingError } from "../../stores/sequencing";
  import { simulationDatasetLatest, spans } from "../../stores/simulation";
  import { permissionHandler } from "../../utilities/permissionHandler";
  import ActivityFilterBuilder from '../timeline/form/TimelineEditor/ActivityFilterBuilder.svelte';
  import { tooltip } from "../../utilities/tooltip";
  import type { ExpansionSequence } from "../../types/expansion";
  import { filteredExpansionSequences } from "../../stores/expansion";

  export let user: User | null;

  type CellRendererParamsActionsFilters = {
    deleteSequenceFilter: (sequence: SequenceFilter) => void;
    openSequenceFilter: (sequence: SequenceFilter, user: User) => void;
  };
  type CellRendererParamsActionsSequences = {

  };
  type CellRendererParamsFilters = ICellRendererParams<SequenceFilter> & CellRendererParamsActionsFilters;
  type CellRendererParamsSequences = ICellRendererParams<ExpansionSequence> & CellRendererParamsActionsSequences;

  const baseColumnDefsFilters: DataGridColumnDef[] = [
    {
      field: 'id',
      filter: 'number',
      headerName: 'ID',
      resizable: true,
      sortable: true,
      width: 55,
    },
    {
      field: 'name',
      filter: 'text',
      headerName: 'Seq Name',
      resizable: true,
      sortable: true,
      width: 100,
    }
  ];
  const baseColumnDefsSequences: DataGridColumnDef[] = [
    {
      field: 'seq_id',
      filter: 'string',
      headerName: 'Sequence ID',
      resizable: true,
      sortable: true,
      width: 55
    }
  ]
  const createPermissionErrorFilters = 'You do not have permission to create a sequence filter';
  const createPermissionErrorSequences = 'You do not have permission to create an expansion sequence';
  const deletePermissionErrorFilters = 'You do not have permission to delete sequence filter';
  const deletePermissionErrorSequences = 'You do not have permission to delete an expansion sequence';

  let columnDefsFilters: DataGridColumnDef[] = baseColumnDefsFilters;
  let columnDefsSequences: DataGridColumnDef[] = baseColumnDefsSequences;
  let dataGridFilters: DataGrid<SequenceFilter>;
  let dataGridSequences: DataGrid<ExpansionSequence>;
  let hasDeletePermissionFilters: boolean = false;
  let hasDeletePermissionSequences: boolean = false;
  let hasCreatePermissionFilters: boolean = false;
  let hasCreatePermissionSequences: boolean = false;
  let selectedSequenceFilterId: number | null = null;
  let selectedSequenceId: string | null = null;
  let selectedSequenceFilterIds: number[] = [];
  let selectedSequenceIds: string[] = [];
  let currentModelSequenceFilters: SequenceFilter[] = [];
  let seqNameInput: string;
  let filterMenu: ActivityFilterBuilder;
  let filterMenuActiveFilter: SequenceActivityFilter = {};

  $: columnDefsFilters = [
    ...columnDefsFilters,
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: CellRendererParamsFilters) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteSequenceFilter,
            deleteTooltip: {
              content: 'Delete Sequence Filter',
              placement: 'bottom',
            },
            hasDeletePermission: hasDeletePermissionFilters,
            rowData: params.data,
            viewCallback: data => user && params.openSequenceFilter(data, user),
            viewTooltip: {
              content: 'Open Sequence Filter',
              placement: 'bottom',
            },
          },
          target: actionsDiv,
        });
        return actionsDiv;
      },
      cellRendererParams: {
        deleteSequenceFilter,
        openSequenceFilter,
      } as CellRendererParamsActionsFilters,
      field: 'actions',
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 55,
    },
  ];

  $: columnDefsSequences = [
    ...columnDefsSequences,
  ];

  $: if (user !== null && $plan !== null) {
    hasDeletePermissionFilters = featurePermissions.sequenceFilter.canDelete(user);
    hasCreatePermissionFilters = featurePermissions.sequenceFilter.canCreate(user);
  }

  $: currentModelSequenceFilters = $sequenceFilters.filter(seqFilter => seqFilter.model_id === $plan?.model_id);

  function deleteSequenceFilter(sequenceFilter: SequenceFilter) {
    effects.deleteSequenceFilters([sequenceFilter.id], user);
  }

  function openSequenceFilter(sequenceFilter: SequenceFilter) {
    showEditorModal(sequenceFilter, "json", `Sequence Filter ID: ${sequenceFilter.id}`, true);
  }

  function onBulkDeleteItemsFilters(event: CustomEvent<SequenceFilter[]>) {
    const { detail: sequenceFiltersToDelete } = event;
    const idsToDelete = sequenceFiltersToDelete.map(sequenceFilter => sequenceFilter.id);
    if (idsToDelete.length > 0) {
      effects.deleteSequenceFilters(idsToDelete, user);
    }
  }

  function onBulkDeleteItemsSequences(event: CustomEvent<ExpansionSequence[]>) {
    console.log("TODO");
  }

  function onRowDoubleClickedFilters(event: CustomEvent<DataGridRowDoubleClick<SequenceFilter>>) {
    const {
      detail: { data: clickedRow },
    } = event;
    if (!$simulationDatasetLatest) {
      sequencingError.set("No latest simulation found - please run simulation before templating!");
      return;
    }
    if ($plan !== null) {
      effects.applyActivitiesByFilter(
        clickedRow,
        $simulationDatasetLatest.id,
        $plan.start_time_doy,
        $plan.end_time_doy,
        user
      );
    }
  }

  function onRowDoubleClickedSequences(event: CustomEvent<DataGridRowDoubleClick<ExpansionSequence>>) {
    console.log("TODO");
  }

  function onToggleFilterMenu() {
    filterMenu.toggle();
  }

  async function onCreateSequenceFilter() {
    // This always *should* be true, but check anyway to keep TS happy
    if ($plan !== null) {
      await effects.createSequenceFilter(filterMenuActiveFilter, seqNameInput, $plan.model_id, user);
      filterMenu.setActiveFilter({}); // Reset filter
      seqNameInput = '';
    }
  }
</script>

<RowVirtualizerFixed />
<div class="sequencing-body">
  <ActivityFilterBuilder
    layerName={seqNameInput}
    bind:this={filterMenu}
    on:rename={newName => {
      seqNameInput = newName.detail.name;
    }}
    on:filterChange={filter => {
      filterMenuActiveFilter = filter.detail.filter;
    }}
  />
  <div class="sequence-filter-form-container">
    <fieldset>
      <div class="seq-name">
        <label for="seqName">Sequence Filter Name</label>
        <input
          bind:value={seqNameInput}
          class="st-input w-100"
          name="seqName"
          use:permissionHandler={{
            hasPermission: hasCreatePermissionFilters,
            permissionError: createPermissionErrorFilters,
          }}
        />
      </div>
    </fieldset>
    <fieldset>
      <button
        class="st-button secondary w-100"
        on:click|stopPropagation={onToggleFilterMenu}
        use:permissionHandler={{
          hasPermission: hasCreatePermissionFilters,
          permissionError: createPermissionErrorFilters,
        }}
      >
        Show Sequence Filter Definition
      </button>
    </fieldset>
    <fieldset>
      <button
        class="st-button active w-100"
        on:click|stopPropagation={onCreateSequenceFilter}
        use:tooltip={{
          content: 'Options for creating a sequence',
          placement: 'top',
        }}
        use:permissionHandler={{
          hasPermission: hasCreatePermissionFilters,
          permissionError: createPermissionErrorFilters,
        }}
      >
        Create Sequence Filter
      </button>
    </fieldset>
  </div>
  <hr />
  <div class="sequencing-filter-table">
    <span class="st-typography-label">Sequence Filters</span>
    <BulkActionDataGrid
      bind:dataGrid={dataGridFilters}
      bind:selectedItemId={selectedSequenceFilterId}
      bind:selectedItemIds={selectedSequenceFilterIds}
      getRowId={rowData => rowData.id}
      columnDefs={columnDefsFilters}
      hasDeletePermission={hasDeletePermissionFilters}
      hasDeletePermissionError={deletePermissionErrorFilters}
      items={currentModelSequenceFilters}
      pluralItemDisplayText="Sequence Filters"
      scrollToSelection={true}
      singleItemDisplayText="Sequence Filter"
      {user}
      on:bulkDeleteItems={e => onBulkDeleteItemsFilters(e)}
      on:rowDoubleClicked={e => onRowDoubleClickedFilters(e)}
    />
  </div>
  <div class="sequencing-filter-table">
    <span class="st-typography-label">Expansion Sequences</span>
    <BulkActionDataGrid
      bind:dataGrid={dataGridSequences}
      bind:selectedItemId={selectedSequenceId}
      bind:selectedItemIds={selectedSequenceIds}
      getRowId={rowData => rowData.seq_id}
      columnDefs={columnDefsSequences}
      hasDeletePermission={hasDeletePermissionSequences}
      hasDeletePermissionError={deletePermissionErrorSequences}
      items={$filteredExpansionSequences}
      pluralItemDisplayText="Sequences"
      scrollToSelection={true}
      singleItemDisplayText="Sequence"
      {user}
      on:bulkDeleteItems={e => onBulkDeleteItemsSequences(e)}
      on:rowDoubleClicked={e => onRowDoubleClickedSequences(e)}
    />
  </div>
</div>

<style>
  .sequencing-body {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .sequencing-filter-table {
    height: 33%;
    margin: 16px;
  }

  hr {
  display: block;
  height: 1px;
  border: 0;
  border-top: 1px solid #ccc;
  margin: 1em 0;
  padding: 0;
}
</style>
