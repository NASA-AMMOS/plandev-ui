<svelte:options immutable={true} />

<script lang="ts">
  import TableFillIcon from '@nasa-jpl/stellar/icons/table_fill.svg?component';
  import TableFitIcon from '@nasa-jpl/stellar/icons/table_fit.svg?component';
  import type { ColDef, ColumnState, ValueGetterParams } from 'ag-grid-community';
  import {
    activityDirectivesList,
    activityDirectivesMap,
    selectActivity,
    selectedActivityDirectiveId,
  } from '../../stores/activities';
  import { plan } from '../../stores/plan';
  import { spanUtilityMaps, spansMap } from '../../stores/simulation';
  import { view, viewTogglePanel, viewUpdateActivityDirectivesTable } from '../../stores/views';
  import type { ActivityDirective } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { ViewGridSection, ViewTable } from '../../types/view';
  import { filterEmpty } from '../../utilities/generic';
  import { getActivityDirectiveStartTimeMs, getDoyTime, getUnixEpochTimeFromInterval } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';
  import GridMenu from '../menus/GridMenu.svelte';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import { tagsCellRenderer, tagsFilterValueGetter } from '../ui/DataGrid/DataGridTags';
  import Panel from '../ui/Panel.svelte';
  import ActivityDirectivesTable from './ActivityDirectivesTable.svelte';
  import ActivityTableMenu from './ActivityTableMenu.svelte';

  export let gridSection: ViewGridSection;
  export let user: User | null;

  type ActivityDirectiveColumns = keyof ActivityDirective | 'derived_start_time';
  interface ActivityDirectiveColDef extends ColDef<ActivityDirective> {
    field: ActivityDirectiveColumns;
  }

  let activityDirectivesTable: ViewTable | undefined;
  let dataGrid: DataGrid<ActivityDirective>;
  let defaultColumnDefinitions: Partial<Record<ActivityDirectiveColumns, ActivityDirectiveColDef>> = {};
  let derivedColumnDefs: ColDef[] = [];

  $: activityDirectivesTable = $view?.definition.plan.activityDirectivesTable;
  $: defaultColumnDefinitions = {
    anchor_id: {
      field: 'anchor_id',
      filter: 'text',
      headerName: 'Anchor ID',
      hide: true,
      resizable: true,
      sortable: true,
    },
    anchored_to_start: {
      field: 'anchored_to_start',
      filter: 'text',
      headerName: 'Anchored to Start',
      hide: true,
      resizable: false,
      sortable: true,
    },
    applied_preset: {
      field: 'applied_preset',
      filter: 'text',
      headerName: 'Applied Preset',
      hide: true,
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<ActivityDirective>) => {
        return params?.data?.applied_preset?.preset_applied.name;
      },
    },
    arguments: {
      field: 'arguments',
      filter: 'text',
      headerName: 'Arguments',
      hide: true,
      resizable: true,
      sortable: false,
      valueGetter: (params: ValueGetterParams<ActivityDirective>) => {
        return JSON.stringify(params?.data?.arguments);
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
    derived_start_time: {
      field: 'derived_start_time',
      filter: 'text',
      headerName: 'Absolute Start Time',
      hide: true,
      resizable: true,
      sortable: true,
      valueGetter: (params: ValueGetterParams<ActivityDirective>) => {
        if ($plan && params && params.data) {
          return getDoyTime(
            new Date(
              getActivityDirectiveStartTimeMs(
                params.data.id,
                $plan.start_time,
                $plan.end_time_doy,
                $activityDirectivesMap,
                $spansMap,
                $spanUtilityMaps,
              ),
            ),
            false,
          );
        }

        return '';
      },
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
      headerName: 'Metadata',
      hide: true,
      resizable: true,
      sortable: false,
      valueGetter: (params: ValueGetterParams<ActivityDirective>) => {
        return JSON.stringify(params.data?.metadata);
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
    start_offset: {
      comparator: (valueA: string, valueB: string) => {
        if ($plan) {
          return (
            getUnixEpochTimeFromInterval($plan.start_time, valueA) -
            getUnixEpochTimeFromInterval($plan.start_time, valueB)
          );
        }
        return valueA.localeCompare(valueB);
      },
      field: 'start_offset',
      filter: 'text',
      headerName: 'Start Offset',
      hide: true,
      resizable: true,
      sortable: true,
    },
    tags: {
      autoHeight: true,
      cellRenderer: tagsCellRenderer,
      field: 'tags',
      filter: 'text',
      filterValueGetter: tagsFilterValueGetter,
      headerName: 'Tags',
      resizable: true,
      sortable: false,
      width: 220,
      wrapText: true,
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
  $: derivedColumnDefs = Object.values(defaultColumnDefinitions).map((defaultColumnDef: ColDef) => {
    const columnDef = activityDirectivesTable?.columnDefs.find(
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
    const activityColumnStates: ColumnState[] = activityDirectivesTable?.columnStates ?? [];
    const existingColumnStateIndex: number = activityColumnStates.findIndex(
      (columnState: ColumnState) => field === columnState.colId,
    );
    if (existingColumnStateIndex >= 0) {
      viewUpdateActivityDirectivesTable({
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
      viewUpdateActivityDirectivesTable({
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
    viewUpdateActivityDirectivesTable({ columnStates: updatedColumnStates });
  }

  function onSelectionChanged() {
    selectActivity($selectedActivityDirectiveId, null, false);
  }

  function onRowDoubleClicked() {
    viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'ActivityFormPanel' } });
  }

  function onShowHideAllColumns({ detail: { hide } }: CustomEvent<{ hide: boolean }>) {
    viewUpdateActivityDirectivesTable({
      columnStates: derivedColumnDefs
        .map((columnDef: ColDef) => {
          const activityColumnStates: ColumnState[] = activityDirectivesTable?.columnStates ?? [];
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
    <GridMenu {gridSection} title="Activity Directives Table" />
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
        columnStates={activityDirectivesTable?.columnStates}
      />
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <ActivityDirectivesTable
      bind:dataGrid
      bind:selectedActivityDirectiveId={$selectedActivityDirectiveId}
      activityDirectives={$activityDirectivesList}
      columnDefs={derivedColumnDefs ?? []}
      columnStates={activityDirectivesTable?.columnStates}
      plan={$plan}
      {user}
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
