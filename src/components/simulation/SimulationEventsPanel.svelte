<svelte:options immutable={true} />

<script lang="ts">
  import TableFillIcon from '@nasa-jpl/stellar/icons/table_fill.svg?component';
  import TableFitIcon from '@nasa-jpl/stellar/icons/table_fit.svg?component';
  import type { ColDef, ColumnResizedEvent, ColumnState, ICellRendererParams } from 'ag-grid-community';
  import { debounce } from 'lodash-es';
  import { InvalidDate } from '../../constants/time';
  import { plugins } from '../../stores/plugins';
  import { simulationDataset, simulationEvents, spansMap } from '../../stores/simulation';
  import { view, viewUpdateSimulationEventsTable } from '../../stores/views';
  import type { SimulationEvent, Span } from '../../types/simulation';
  import type { AutoSizeColumns, ViewGridSection, ViewTable } from '../../types/view';
  import { filterEmpty } from '../../utilities/generic';
  import { formatDate, getUnixEpochTimeFromInterval } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import ActivityTableMenu from '../activity/ActivityTableMenu.svelte';
  import GridMenu from '../menus/GridMenu.svelte';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import IconCellRenderer from '../ui/IconCellRenderer.svelte';
  import Panel from '../ui/Panel.svelte';
  import SimulationEventsTable from './SimulationEventsTable.svelte';

  export let gridSection: ViewGridSection;

  type SimulationEventColumns = keyof (SimulationEvent & { span: Span }) | 'derived_start_time';
  type SimulationEventColDef = ColDef<SimulationEvent & { span: Span } & { derived_start_time: number }>;

  let simulationEventsTable: ViewTable | undefined;
  let autoSizeColumns: AutoSizeColumns | undefined;
  let dataGrid: DataGrid<SimulationEvent>;
  let defaultColumnDefinitions: Partial<Record<SimulationEventColumns, SimulationEventColDef>>;
  let derivedColumnDefs: ColDef[] = [];
  let filterExpression: string = '';
  let onGridSizeChangedDebounced = debounce(onGridSizeChanged, 100);
  let viewUpdateSimulationEventsTableDebounced = debounce(viewUpdateSimulationEventsTable, 100);

  $: simulationEventsTable = $view?.definition.plan.simulationEventsTable;
  $: autoSizeColumns = simulationEventsTable?.autoSizeColumns;
  /* eslint-disable sort-keys */
  $: defaultColumnDefinitions = {
    derived_start_time: {
      filter: 'text',
      field: 'derived_start_time',
      headerName: `Absolute Start Time (${$plugins.time.primary.label})`,
      sort: 'asc',
      resizable: true,
      sortable: true,
      valueGetter: params => {
        if ($simulationDataset && $simulationDataset.simulation_start_time && params.data) {
          return formatDate(
            new Date(getUnixEpochTimeFromInterval($simulationDataset?.simulation_start_time, params.data.start_offset)),
            $plugins.time.primary.format,
          );
        }
        return '';
      },
      cellRenderer: (params: ICellRendererParams<SimulationEvent>) => {
        if (params.value !== InvalidDate) {
          return params.value;
        }
        const div = document.createElement('div');

        new IconCellRenderer({
          props: { type: 'error' },
          target: div,
        });

        return div;
      },
    },
    start_offset: {
      field: 'start_offset',
      filter: 'text',
      headerName: 'Start Offset',
      hide: true,
      resizable: true,
      sortable: true,
    },
    dense_time: {
      field: 'dense_time',
      filter: 'text',
      headerName: 'Dense Time',
      resizable: true,
      sortable: true,
    },
    topic: {
      field: 'topic',
      filter: 'text',
      headerName: 'Topic',
      resizable: true,
      sortable: true,
    },
    value: {
      field: 'value',
      filter: 'text',
      headerName: 'Value',
      resizable: true,
      sortable: true,
    },
    span: {
      field: 'span',
      hide: true,
      filter: 'text',
      headerName: 'Span',
      resizable: true,
      sortable: true,
      valueGetter: params => {
        if (params.data?.span_id) {
          const span = $spansMap[params.data?.span_id] || null;
          if (span) {
            return JSON.stringify(span);
          }
        }
        return '';
      },
    },
  };
  /* eslint-enable sort-keys */
  $: derivedColumnDefs = Object.values(defaultColumnDefinitions).map((defaultColumnDef: ColDef) => {
    const columnDef = simulationEventsTable?.columnDefs.find(
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

  function autoSizeContent() {
    dataGrid?.autoSizeAllColumns();
  }

  function autoSizeSpace() {
    dataGrid?.sizeColumnsToFit();
  }

  function onColumnToggleChange({ detail: { field, isHidden } }: CustomEvent) {
    const columnStates: ColumnState[] = simulationEventsTable?.columnStates ?? [];
    const existingColumnStateIndex: number = columnStates.findIndex(
      (columnState: ColumnState) => field === columnState.colId,
    );
    if (existingColumnStateIndex >= 0) {
      viewUpdateSimulationEventsTable({
        columnStates: [
          ...columnStates.slice(0, existingColumnStateIndex),
          {
            ...columnStates[existingColumnStateIndex],
            hide: isHidden,
          },
          ...columnStates.slice(existingColumnStateIndex + 1),
        ],
      });
    } else {
      viewUpdateSimulationEventsTable({
        columnStates: [
          ...columnStates,
          {
            colId: field,
            hide: isHidden,
          },
        ],
      });
    }

    setTimeout(() => {
      if (autoSizeColumns === 'fit') {
        autoSizeContent();
      } else if (autoSizeColumns === 'fill') {
        autoSizeSpace();
      }
    }, 0);
  }

  function onColumnMoved() {
    const columnStates = dataGrid?.getColumnState();
    const updatedColumnStates = (columnStates ?? []).filter(columnState => columnState.colId !== 'actions');
    viewUpdateSimulationEventsTable({ columnStates: updatedColumnStates });
  }

  function onColumnPinned() {
    const columnStates = dataGrid?.getColumnState();
    const updatedColumnStates = (columnStates ?? []).filter(columnState => columnState.colId !== 'actions');
    viewUpdateSimulationEventsTable({ columnStates: updatedColumnStates });
  }

  function onColumnResized({ detail }: CustomEvent<ColumnResizedEvent>) {
    const { source } = detail;

    const columnStates = dataGrid?.getColumnState();
    const updatedColumnStates = (columnStates ?? []).filter(columnState => columnState.colId !== 'actions');
    if (source === 'uiColumnResized') {
      viewUpdateSimulationEventsTableDebounced({ autoSizeColumns: 'off', columnStates: updatedColumnStates });
    } else {
      viewUpdateSimulationEventsTable({ columnStates: updatedColumnStates });
    }
  }

  function onColumnVisible() {
    const columnStates = dataGrid?.getColumnState();
    const updatedColumnStates = (columnStates ?? []).filter(columnState => columnState.colId !== 'actions');
    viewUpdateSimulationEventsTable({ columnStates: updatedColumnStates });
  }

  function onGridSizeChanged() {
    if (simulationEventsTable?.autoSizeColumns === 'fill') {
      autoSizeSpace();
    } else if (simulationEventsTable?.autoSizeColumns === 'fit') {
      autoSizeContent();
    }
  }

  function onSelectionChanged() {
    // selectActivity(null, $selectedSpanId, false);
  }

  function onRowDoubleClicked() {
    // viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'ActivityFormPanel' } });
  }

  function onShowHideAllColumns({ detail: { hide } }: CustomEvent<{ hide: boolean }>) {
    viewUpdateSimulationEventsTable({
      columnStates: derivedColumnDefs
        .map((columnDef: ColDef) => {
          const columnStates: ColumnState[] = simulationEventsTable?.columnStates ?? [];
          const existingColumnState: ColumnState | undefined = columnStates.find(
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

  function toggleAutoSizeContent() {
    if (autoSizeColumns !== 'fit') {
      viewUpdateSimulationEventsTable({ autoSizeColumns: 'fit' });
      autoSizeContent();
    } else {
      viewUpdateSimulationEventsTable({ autoSizeColumns: 'off' });
    }
  }

  function toggleAutoSizeSpace() {
    if (autoSizeColumns !== 'fill') {
      viewUpdateSimulationEventsTable({ autoSizeColumns: 'fill' });
      autoSizeSpace();
    } else {
      viewUpdateSimulationEventsTable({ autoSizeColumns: 'off' });
    }
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Simulation Events Table" />
    <div class="table-menu">
      <input type="search" bind:value={filterExpression} placeholder="Filter Simulation Events" class="st-input" />
      <div class="size-actions">
        <button
          class="st-button secondary"
          class:selected={autoSizeColumns === 'fit'}
          use:tooltip={{ content: 'Toggle Auto Fit Columns to Content', placement: 'top' }}
          on:click={toggleAutoSizeContent}
        >
          <TableFitIcon />
        </button>
        <button
          class="st-button secondary"
          class:selected={autoSizeColumns === 'fill'}
          use:tooltip={{ content: 'Toggle Auto Fit Columns to Available Space', placement: 'top' }}
          on:click={toggleAutoSizeSpace}
        >
          <TableFillIcon />
        </button>
      </div>
      <ActivityTableMenu
        on:toggle-column={onColumnToggleChange}
        on:show-hide-all-columns={onShowHideAllColumns}
        columnDefs={derivedColumnDefs}
        columnStates={simulationEventsTable?.columnStates}
      />
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <SimulationEventsTable
      bind:dataGrid
      columnDefs={derivedColumnDefs ?? []}
      columnStates={simulationEventsTable?.columnStates}
      {filterExpression}
      simulationEvents={$simulationEvents}
      on:columnMoved={onColumnMoved}
      on:columnPinned={onColumnPinned}
      on:columnResized={onColumnResized}
      on:columnVisible={onColumnVisible}
      on:gridSizeChanged={onGridSizeChangedDebounced}
      on:rowDoubleClicked={onRowDoubleClicked}
      on:selectionChanged={onSelectionChanged}
    />
  </svelte:fragment>
</Panel>

<style>
  .table-menu {
    column-gap: 1rem;
    display: flex;
  }

  .st-button.secondary.selected {
    background: var(--st-gray-20);
  }
</style>
