<svelte:options immutable={true} />

<script lang="ts">
  import CollapseIcon from '@nasa-jpl/stellar/icons/collapse.svg?component';
  import ExpandIcon from '@nasa-jpl/stellar/icons/expand.svg?component';
  import type { ColDef, ColumnState, ValueFormatterParams, ValueGetterParams } from 'ag-grid-community';
  import { view, viewUpdateActivityTables } from '../../stores/views';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import ActivityTable from './ActivityTable.svelte';
  import ActivityTableMenu from './ActivityTableMenu.svelte';

  export let activityTableId: number;
  export let gridId: number;

  const defaultColumnDefinitions: Partial<Record<keyof Activity, ColDef<Activity>>> = {
    arguments: {
      field: 'arguments',
      filter: 'text',
      filterValueGetter: (params: ValueGetterParams<Activity>) => {
        return JSON.stringify(params.data.arguments);
      },
      headerName: 'Arguments',
      hide: true,
      resizable: true,
      sortable: false,
      valueFormatter: ({ value: argumentsMap }: ValueFormatterParams<Activity, ArgumentsMap>) => {
        return JSON.stringify(argumentsMap);
      },
    },
    created_at: {
      field: 'created_at',
      filter: 'text',
      headerName: 'Created At',
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
    last_modified_at: {
      field: 'last_modified_at',
      filter: 'text',
      headerName: 'Last Modified At',
      hide: true,
      resizable: true,
      sortable: true,
    },
    metadata: {
      field: 'metadata',
      filter: 'text',
      filterValueGetter: (params: ValueGetterParams<Activity>) => {
        return JSON.stringify(params.data.metadata);
      },
      headerName: 'Metadata',
      hide: true,
      resizable: true,
      sortable: false,
      valueFormatter: ({ value: metadata }: ValueFormatterParams<TRowData, ActivityMetadata>) => {
        return JSON.stringify(metadata);
      },
    },
    name: {
      field: 'name',
      filter: 'text',
      headerName: 'Name',
      hide: true,
      resizable: true,
      sortable: true,
    },
    source_scheduling_goal_id: {
      field: 'source_scheduling_goal_id',
      filter: 'number',
      headerName: 'Scheduling Goal ID',
      hide: true,
      resizable: true,
      sortable: true,
    },
    start_time_doy: {
      field: 'start_time',
      filter: 'text',
      headerName: 'Start Time',
      hide: true,
      resizable: true,
      sortable: true,
    },
    tags: {
      field: 'tags',
      filter: 'text',
      headerName: 'Tags',
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

  let activityTable: ViewActivityTable;
  let dataGrid: DataGrid;
  let derivedColumnDefs: ColDef[] = [];

  $: activityTable = $view?.definition.plan.activityTables.find(table => table.id === activityTableId);
  $: derivedColumnDefs = Object.values(defaultColumnDefinitions).map((defaultColumnDef: ColDef) => {
    const columnDef = activityTable.columnDefs.find((columnDef: ColDef) => columnDef.field === defaultColumnDef.field);
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
    const activityColumnStates: ColumnState[] = activityTable?.columnStates ?? [];
    const existingColumnStateIndex: number = activityColumnStates.findIndex(
      (columnState: ColumnState) => field === columnState.colId,
    );
    if (existingColumnStateIndex >= 0) {
      viewUpdateActivityTables(
        {
          columnStates: [
            ...activityColumnStates.slice(0, existingColumnStateIndex),
            {
              ...activityColumnStates[existingColumnStateIndex],
              hide: isHidden,
            },
            ...activityColumnStates.slice(existingColumnStateIndex + 1),
          ],
        },
        activityTableId,
      );
    } else {
      viewUpdateActivityTables(
        {
          columnStates: [
            ...activityColumnStates,
            {
              colId: field,
              hide: isHidden,
            },
          ],
        },
        activityTableId,
      );
    }
  }

  function onColumnStateChange({ detail: columnStates }: CustomEvent<ColumnState[]>) {
    const updatedColumnStates = columnStates.filter(columnState => columnState.colId !== 'actions');

    viewUpdateActivityTables({ columnStates: updatedColumnStates }, activityTableId);
  }

  function onShowHideAllColumns({ detail: { hide } }: CustomEvent<{ hide: boolean }>) {
    viewUpdateActivityTables(
      {
        columnStates: derivedColumnDefs.map((columnDef: ColDef) => {
          const activityColumnStates: ColumnState[] = activityTable?.columnStates ?? [];
          const existingColumnState: ColumnState | undefined = activityColumnStates.find(
            (columnState: ColumnState) => columnDef.field === columnState.colId,
          );

          return {
            ...existingColumnState,
            hide,
          };
        }),
      },
      activityTableId,
    );
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridId} title="Activity Table" />
    <div class="table-menu">
      <div class="size-actions">
        <button
          class="st-button secondary"
          use:tooltip={{ content: 'Auto Size Columns to Fit Content', placement: 'top' }}
          on:click={onAutoSizeContent}><CollapseIcon /></button
        >
        <button
          class="st-button secondary"
          use:tooltip={{ content: 'Auto Size Columns to Fit Space', placement: 'top' }}
          on:click={onAutoSizeSpace}><ExpandIcon /></button
        >
      </div>
      <ActivityTableMenu
        on:toggle-column={onColumnToggleChange}
        on:show-hide-all-columns={onShowHideAllColumns}
        columnDefs={derivedColumnDefs}
        columnStates={activityTable?.columnStates}
      />
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <ActivityTable
      bind:dataGrid
      columnDefs={derivedColumnDefs ?? []}
      columnStates={activityTable?.columnStates}
      on:columnStateChange={onColumnStateChange}
    />
  </svelte:fragment>
</Panel>

<style>
  .table-menu {
    column-gap: 1rem;
    display: flex;
  }
</style>
