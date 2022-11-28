<svelte:options immutable={true} />

<script lang="ts">
  import type { ColDef, ColumnState } from 'ag-grid-community';
  import { activities, selectedActivityId } from '../../stores/activities';
  import effects from '../../utilities/effects';
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';

  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let dataGrid: DataGrid = undefined;
  export let planId: number;

  type CellRendererParams = {
    deleteActivityDirective: (activity: Activity) => void;
  };
  type ActivityCellRendererParams = ICellRendererParams<Activity> & CellRendererParams;

  const activityActionColumnDef: DataGridColumnDef = {
    cellClass: 'action-cell-container',
    cellRenderer: (params: ActivityCellRendererParams) => {
      const isParent = params.data.parent_id === null;
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'actions-cell';
      new DataGridActions({
        props: {
          ...(isParent
            ? {
                deleteCallback: params.deleteActivityDirective,
                deleteTooltip: {
                  content: 'Delete Activity',
                  placement: 'bottom',
                },
              }
            : {}),
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

  function deleteActivityDirective({ id, plan_id }: Activity) {
    effects.deleteActivityDirective(plan_id, id);
  }

  function deleteActivityDirectives({ detail: activities }: CustomEvent<Activity[]>) {
    const ids = activities.map(({ id }) => id);
    effects.deleteActivityDirectives(planId, ids);
  }

  function getRowId(activity: Activity): ActivityUniqueId {
    return activity.uniqueId;
  }
</script>

<BulkActionDataGrid
  bind:dataGrid
  columnDefs={[...(columnDefs ?? []), activityActionColumnDef]}
  {columnStates}
  {getRowId}
  items={$activities}
  pluralItemDisplayText="Activities"
  singleItemDisplayText="Activity"
  suppressDragLeaveHidesColumns={false}
  bind:selectedItemId={$selectedActivityId}
  on:bulkDeleteItems={deleteActivityDirectives}
  on:columnStateChange
/>
