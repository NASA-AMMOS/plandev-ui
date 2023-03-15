<svelte:options immutable={true} />

<script lang="ts">
  import TableFillIcon from '@nasa-jpl/stellar/icons/table_fill.svg?component';
  import TableFitIcon from '@nasa-jpl/stellar/icons/table_fit.svg?component';
  import type { ColDef, ColumnState } from 'ag-grid-community';
  import { selectActivity } from '../../stores/activities';
  import { selectedSpanId, spans } from '../../stores/simulation';
  import { view, viewUpdateActivitySpansTable } from '../../stores/views';
  import type { Span } from '../../types/simulation';
  import type { ViewGridSection, ViewTable } from '../../types/view';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import ActivitySpansTable from './ActivitySpansTable.svelte';
  import ActivityTableMenu from './ActivityTableMenu.svelte';

  export let gridSection: ViewGridSection;

  interface SpanColDef extends ColDef<Span> {
    field: keyof Span;
  }

  const defaultColumnDefinitions: Partial<Record<keyof Span, SpanColDef>> = {
    dataset_id: {
      field: 'dataset_id',
      filter: 'text',
      headerName: 'Dataset ID',
      hide: true,
      resizable: true,
      sortable: true,
    },
    duration: {
      field: 'duration',
      filter: 'text',
      headerName: 'Duration',
      hide: true,
      resizable: true,
      sortable: true,
    },
    id: {
      field: 'id',
      filter: 'text',
      headerName: 'ID',
      hide: true,
      resizable: true,
      sortable: true,
    },
    parent_id: {
      field: 'parent_id',
      filter: 'text',
      headerName: 'Parent ID',
      hide: true,
      resizable: true,
      sortable: true,
    },
    start_offset: {
      field: 'start_offset',
      filter: 'text',
      headerName: 'Start Offset',
      hide: true,
      resizable: true,
      sortable: true,
    },
    type: {
      field: 'type',
      filter: 'text',
      headerName: 'Type',
      hide: true,
      resizable: true,
      sortable: true,
    },
  };

  let activitySpansTable: ViewTable;
  let dataGrid: DataGrid;
  let derivedColumnDefs: ColDef[] = [];

  $: activitySpansTable = $view?.definition.plan.activitySpansTable;
  $: derivedColumnDefs = Object.values(defaultColumnDefinitions).map((defaultColumnDef: ColDef) => {
    const columnDef = activitySpansTable.columnDefs.find(
      (columnDef: ColDef) => columnDef.field === defaultColumnDef.field,
    );
    if (columnDef) {
      return {
        ...defaultColumnDef,
        ...columnDef,
        hide: columnDef.hide ?? false,
      };
    }

    return defaultColumnDef;
  });

  function onAutoSizeContent() {
    dataGrid?.autoSizeAllColumns();
  }

  function onAutoSizeSpace() {
    dataGrid?.sizeColumnsToFit();
  }

  function onColumnToggleChange({ detail: { field, isHidden } }: CustomEvent) {
    const activityColumnStates: ColumnState[] = activitySpansTable?.columnStates ?? [];
    const existingColumnStateIndex: number = activityColumnStates.findIndex(
      (columnState: ColumnState) => field === columnState.colId,
    );
    if (existingColumnStateIndex >= 0) {
      viewUpdateActivitySpansTable({
        columnStates: [
          ...activityColumnStates.slice(0, existingColumnStateIndex),
          {
            ...activityColumnStates[existingColumnStateIndex],
            hide: isHidden,
          },
          ...activityColumnStates.slice(existingColumnStateIndex + 1),
        ],
      });
    } else {
      viewUpdateActivitySpansTable({
        columnStates: [
          ...activityColumnStates,
          {
            colId: field,
            hide: isHidden,
          },
        ],
      });
    }
  }

  function onColumnStateChange({ detail: columnStates }: CustomEvent<ColumnState[]>) {
    const updatedColumnStates = columnStates.filter(columnState => columnState.colId !== 'actions');
    viewUpdateActivitySpansTable({ columnStates: updatedColumnStates });
  }

  function onSelectionChanged() {
    selectActivity(null, $selectedSpanId, false);
  }

  function onShowHideAllColumns({ detail: { hide } }: CustomEvent<{ hide: boolean }>) {
    viewUpdateActivitySpansTable({
      columnStates: derivedColumnDefs.map((columnDef: ColDef) => {
        const activityColumnStates: ColumnState[] = activitySpansTable?.columnStates ?? [];
        const existingColumnState: ColumnState | undefined = activityColumnStates.find(
          (columnState: ColumnState) => columnDef.field === columnState.colId,
        );

        return {
          ...existingColumnState,
          hide,
        };
      }),
    });
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Simulated Activities Table" />
    <div class="table-menu">
      <div class="size-actions">
        <button
          class="st-button secondary"
          use:tooltip={{ content: 'Fit Columns to Content', placement: 'top' }}
          on:click={onAutoSizeContent}
        >
          <TableFitIcon />
        </button>
        <button
          class="st-button secondary"
          use:tooltip={{ content: 'Fit Columns to Available Space', placement: 'top' }}
          on:click={onAutoSizeSpace}
        >
          <TableFillIcon />
        </button>
      </div>
      <ActivityTableMenu
        on:toggle-column={onColumnToggleChange}
        on:show-hide-all-columns={onShowHideAllColumns}
        columnDefs={derivedColumnDefs}
        columnStates={activitySpansTable?.columnStates}
      />
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <ActivitySpansTable
      bind:dataGrid
      bind:selectedSpanId={$selectedSpanId}
      columnDefs={derivedColumnDefs ?? []}
      columnStates={activitySpansTable?.columnStates}
      spans={$spans}
      on:columnStateChange={onColumnStateChange}
      on:selectionChanged={onSelectionChanged}
    />
  </svelte:fragment>
</Panel>

<style>
  .table-menu {
    column-gap: 1rem;
    display: flex;
  }
</style>
