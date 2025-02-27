<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams } from 'ag-grid-community';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef, DataGridRowDoubleClick, RowId } from '../../types/data-grid';
  import type { SequenceActivityFilter, SequenceFilter } from '../../types/sequencing';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import RowVirtualizerFixed from '../RowVirtualizerFixed.svelte';
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import { showEditorModal } from '../../utilities/modal';
  import effects from '../../utilities/effects';
  import { featurePermissions } from '../../utilities/permissions';
  import { plan } from '../../stores/plan';
  import { sequenceFilters, sequencingError } from '../../stores/sequencing';
  import { simulationDatasetLatest } from '../../stores/simulation';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import ActivityFilterBuilder from '../timeline/form/TimelineEditor/ActivityFilterBuilder.svelte';
  import { tooltip } from '../../utilities/tooltip';
  import type { ExpansionSequence } from '../../types/expansion';
  import { filteredExpansionSequences } from '../../stores/expansion';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';

  export let user: User | null;

  type CellRendererParamsActionsFilters = {
    deleteSequenceFilter: (sequence: SequenceFilter, user: User) => void;
    openSequenceFilter: (sequence: SequenceFilter) => void;
  };
  type CellRendererParamsActionsSequences = {
    deleteSequence: (sequence: ExpansionSequence, user: User) => void;
    openSequence: (sequence: ExpansionSequence) => void;
  };
  type CellRendererParamsFilters = ICellRendererParams<SequenceFilter> & CellRendererParamsActionsFilters;
  type CellRendererParamsSequences = ICellRendererParams<ExpansionSequence> & CellRendererParamsActionsSequences;

  const baseColumnDefsFilters: DataGridColumnDef[] = [
    {
      field: 'name',
      filter: 'text',
      headerName: 'Seq Name',
      resizable: true,
      sortable: true,
      width: 100,
    },
  ];
  const baseColumnDefsSequences: DataGridColumnDef[] = [
    {
      field: 'seq_id',
      filter: 'string',
      headerName: 'Sequence ID',
      resizable: true,
      sortable: true,
      width: 55,
    },
  ];
  const createPermissionErrorFilters = 'You do not have permission to create a sequence filter';
  const deletePermissionErrorFilters = 'You do not have permission to delete sequence filter';
  const deletePermissionErrorSequences = 'You do not have permission to delete an expansion sequence';

  let columnDefsFilters: DataGridColumnDef[] = baseColumnDefsFilters;
  let columnDefsSequences: DataGridColumnDef[] = baseColumnDefsSequences;
  let dataGridFilters: DataGrid<SequenceFilter>;
  let dataGridSequences: DataGrid<ExpansionSequence>;
  let hasDeletePermissionFilters: boolean = false;
  let hasDeletePermissionSequences: boolean = false;
  let hasCreatePermissionFilters: boolean = false;
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
            deleteCallback: data => user && params.deleteSequenceFilter(data, user),
            deleteTooltip: {
              content: 'Delete Sequence Filter',
              placement: 'bottom',
            },
            hasDeletePermission: hasDeletePermissionFilters,
            rowData: params.data,
            viewCallback: params.openSequenceFilter,
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
    {
      cellClass: 'action-cell-container',
      cellRenderer: (params: CellRendererParamsSequences) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: data => user && params.deleteSequence(data, user),
            deleteTooltip: {
              content: 'Delete Sequence',
              placement: 'bottom',
            },
            hasDeletePermission: hasDeletePermissionSequences,
            rowData: params.data,
            viewCallback: data => user && params.openSequence(data),
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
        deleteSequence,
        openSequence,
      } as CellRendererParamsActionsSequences,
      field: 'actions',
      headerName: '',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 55,
    }
  ];

  $: if (user !== null && $plan !== null) {
    hasDeletePermissionFilters = featurePermissions.sequenceFilter.canDelete(user);
    hasCreatePermissionFilters = featurePermissions.sequenceFilter.canCreate(user);
  }

  $: currentModelSequenceFilters = $sequenceFilters.filter(seqFilter => seqFilter.model_id === $plan?.model_id);

  function deleteSequence(sequence: ExpansionSequence) {
    effects.deleteExpansionSequence(sequence, user);
  }

  function deleteSequenceFilter(sequenceFilter: SequenceFilter) {
    effects.deleteSequenceFilters([sequenceFilter.id], user);
  }

  function openSequence(sequence: ExpansionSequence) {
    console.log("TODO");
  }

  function openSequenceFilter(sequenceFilter: SequenceFilter) {
    showEditorModal(sequenceFilter, 'json', `Sequence Filter ID: ${sequenceFilter.id}`, true);
  }

  function onBulkDeleteItemsFilters(event: CustomEvent<SequenceFilter[]>) {
    const { detail: sequenceFiltersToDelete } = event;
    const idsToDelete = sequenceFiltersToDelete.map(sequenceFilter => sequenceFilter.id);
    if (idsToDelete.length > 0) {
      effects.deleteSequenceFilters(idsToDelete, user);
    }
  }

  function onDeleteSequence(event: CustomEvent<RowId[]>) {
    const id = event.detail[0] as string;
    const selectedSequence: ExpansionSequence | undefined = $filteredExpansionSequences.find(sequence => sequence.seq_id === id);
    if (selectedSequence !== undefined) {
      effects.deleteExpansionSequence(selectedSequence, user);
    }
  }

  function onRowDoubleClickedFilters(event: CustomEvent<DataGridRowDoubleClick<SequenceFilter>>) {
    const {
      detail: { data: clickedRow },
    } = event;
    if (!$simulationDatasetLatest) {
      sequencingError.set('No latest simulation found - please run simulation before templating!');
      return;
    }
    if ($plan !== null) {
      effects.applyActivitiesByFilter(
        clickedRow,
        $simulationDatasetLatest.id,
        $plan.start_time_doy,
        $plan.end_time_doy,
        user,
      );
    }
  }

  function onRowDoubleClickedSequences(event: CustomEvent<DataGridRowDoubleClick<ExpansionSequence>>) {
    console.log('TODO');
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
    <SingleActionDataGrid
      bind:dataGrid={dataGridSequences}
      bind:selectedItemId={selectedSequenceId}
      getRowId={rowData => rowData.seq_id}
      columnDefs={columnDefsSequences}
      hasDeletePermission={hasDeletePermissionSequences}
      items={$filteredExpansionSequences}
      scrollToSelection={true}
      itemDisplayText="Expansion Sequence"
      {user}
      on:deleteItem={onDeleteSequence}
      on:rowDoubleClicked={onRowDoubleClickedSequences}
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
