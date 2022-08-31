<svelte:options immutable={true} />

<script lang="ts">
  import type { ColumnState } from 'ag-grid-community';
  import { activities, selectedActivityId } from '../../stores/activities';
  import { view, viewUpdateActivityTables } from '../../stores/views';
  import effects from '../../utilities/effects';
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';

  export let activityTableId: number;

  type CellRendererParams = {
    deleteActivityDirective: (activity: Activity) => void;
  };
  type ActivityCellRendererParams = ICellRendererParams<Activity> & CellRendererParams;

  const activityActionColumnDef: DataGridColumnDef = {
    cellClass: 'action-cell-container',
    cellRenderer: (params: ActivityCellRendererParams) => {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'actions-cell';
      new DataGridActions({
        props: {
          deleteCallback: params.deleteActivityDirective,
          deleteTooltip: {
            content: 'Delete Activity',
            placement: 'bottom',
          },
          rowData: params.data,
        },
        target: actionsDiv,
      });

      return actionsDiv;
    },
    cellRendererParams: {
      deleteActivityDirective,
    } as CellRendererParams,
    field: 'actions',
    headerName: '',
    resizable: false,
    sortable: false,
    suppressAutoSize: true,
    suppressSizeToFit: true,
    width: 25,
  };

  let activityTable: ViewActivityTable;

  $: activityTable = $view?.definition.plan.activityTables.find(table => table.id === activityTableId);

  function deleteActivityDirective({ id }: Activity) {
    effects.deleteActivityDirective(id);
  }

  function deleteActivityDirectives({ detail: ids }: CustomEvent<number[]>) {
    effects.deleteActivityDirectives(ids);
  }

  function onColumnStateChange({ detail: columnStates }: CustomEvent<ColumnState[]>) {
    viewUpdateActivityTables(
      { columnStates: columnStates.filter(columnState => columnState.colId !== 'actions') },
      activityTableId,
    );
  }
</script>

<BulkActionDataGrid
  columnDefs={[...(activityTable?.columnDefs ?? []), activityActionColumnDef]}
  columnStates={activityTable?.columnStates}
  items={$activities}
  pluralItemDisplayText="Activities"
  singleItemDisplayText="Activity"
  bind:selectedItemId={$selectedActivityId}
  on:bulkDeleteItems={deleteActivityDirectives}
  on:columnStateChange={onColumnStateChange}
/>
