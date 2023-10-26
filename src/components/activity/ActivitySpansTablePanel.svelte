<svelte:options immutable={true} />

<script lang="ts">
  import TableFillIcon from '@nasa-jpl/stellar/icons/table_fill.svg?component';
  import TableFitIcon from '@nasa-jpl/stellar/icons/table_fit.svg?component';
  import type { ColDef, ColumnState } from 'ag-grid-community';
  import { selectActivity } from '../../stores/activities';
  import { selectedSpanId, simulationDataset, spans } from '../../stores/simulation';
  import { view, viewTogglePanel, viewUpdateActivitySpansTable } from '../../stores/views';
  import type { Span } from '../../types/simulation';
  import type { ViewGridSection, ViewTable } from '../../types/view';
  import { filterEmpty } from '../../utilities/generic';
  import { convertDoyToYmd, getDoyTimeFromInterval } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import ActivitySpansTable from './ActivitySpansTable.svelte';
  import ActivityTableMenu from './ActivityTableMenu.svelte';

  export let gridSection: ViewGridSection;

  type SpanColumns = keyof Span | 'derived_start_time' | 'derived_end_time';
  interface SpanColDef extends ColDef<Span> {
    field: SpanColumns;
  }

  let activitySpansTable: ViewTable | undefined;
  let dataGrid: DataGrid<Span>;
  let defaultColumnDefinitions: Partial<Record<SpanColumns, SpanColDef>>;
  let derivedColumnDefs: ColDef[] = [];
  let filterExpression: string = '';

  $: activitySpansTable = $view?.definition.plan.activitySpansTable;
  /* eslint-disable sort-keys */
  $: defaultColumnDefinitions = {
    dataset_id: {
      field: 'dataset_id',
      filter: 'text',
      headerName: 'Dataset ID',
      hide: true,
      resizable: true,
      sortable: true,
    },
    derived_start_time: {
      field: 'derived_start_time',
      filter: 'text',
      headerName: 'Absolute Start Time',
      hide: true,
      resizable: true,
      sortable: true,
      valueGetter: params => {
        if ($simulationDataset && $simulationDataset.simulation_start_time && params.data) {
          return getDoyTimeFromInterval($simulationDataset?.simulation_start_time, params.data.start_offset);
        }
        return '';
      },
    },
    derived_end_time: {
      field: 'derived_end_time',
      filter: 'text',
      headerName: 'Absolute End Time',
      hide: true,
      resizable: true,
      sortable: true,
      valueGetter: params => {
        if ($simulationDataset && $simulationDataset.simulation_start_time && params.data) {
          const startTime = convertDoyToYmd(
            getDoyTimeFromInterval($simulationDataset?.simulation_start_time, params.data.start_offset),
          );
          return startTime ? getDoyTimeFromInterval(startTime, params.data.duration) : '';
        }
        return '';
      },
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
  /* eslint-enable sort-keys */
  $: derivedColumnDefs = Object.values(defaultColumnDefinitions).map((defaultColumnDef: ColDef) => {
    const columnDef = activitySpansTable?.columnDefs.find(
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

  function onColumnStateChange({ detail: columnStates }: CustomEvent<ColumnState[] | undefined>) {
    const updatedColumnStates = (columnStates ?? []).filter(columnState => columnState.colId !== 'actions');
    viewUpdateActivitySpansTable({ columnStates: updatedColumnStates });
  }

  function onSelectionChanged() {
    selectActivity(null, $selectedSpanId, false);
  }

  function onRowDoubleClicked() {
    viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'ActivityFormPanel' } });
  }

  function onShowHideAllColumns({ detail: { hide } }: CustomEvent<{ hide: boolean }>) {
    viewUpdateActivitySpansTable({
      columnStates: derivedColumnDefs
        .map((columnDef: ColDef) => {
          const activityColumnStates: ColumnState[] = activitySpansTable?.columnStates ?? [];
          const existingColumnState: ColumnState | undefined = activityColumnStates.find(
            (columnState: ColumnState) => columnDef.field === columnState.colId,
          );

          return existingColumnState
            ? {
                ...existingColumnState,
                hide,
              }
            : null;
        })
        .filter(filterEmpty),
    });
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Simulated Activities Table" />
    <div class="table-menu">
      <input type="search" bind:value={filterExpression} placeholder="Filter Simulated Activities" class="st-input" />
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
      {filterExpression}
      spans={$spans}
      on:columnStateChange={onColumnStateChange}
      on:selectionChanged={onSelectionChanged}
      on:rowDoubleClicked={onRowDoubleClicked}
    />
  </svelte:fragment>
</Panel>

<style>
  .table-menu {
    column-gap: 1rem;
    display: flex;
  }
</style>
