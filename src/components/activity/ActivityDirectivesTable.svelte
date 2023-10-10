<svelte:options immutable={true} />

<script lang="ts">
  import type { ColDef, ColumnState, ICellRendererParams } from 'ag-grid-community';
  import type { ActivityDirective, ActivityDirectiveId } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { Plan } from '../../types/plan';
  import effects from '../../utilities/effects';
  import { featurePermissions } from '../../utilities/permissions';
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';

  export let activityDirectives: ActivityDirective[] = [];
  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let dataGrid: DataGrid<ActivityDirective> | undefined = undefined;
  export let plan: Plan | null;
  export let selectedActivityDirectiveId: ActivityDirectiveId | null = null;
  export let planReadOnly: boolean = false;
  export let user: User | null;

  type CellRendererParams = {
    deleteActivityDirective: (activity: ActivityDirective) => void;
  };
  type ActivityCellRendererParams = ICellRendererParams<ActivityDirective> & CellRendererParams;

  let activityActionColumnDef: DataGridColumnDef | null = null;
  let completeColumnDefs: ColDef[] = columnDefs;
  let hasDeletePermission: boolean = false;
  let isDeletingDirective: boolean = false;

  $: hasDeletePermission =
    plan !== null ? featurePermissions.activityDirective.canDelete(user, plan) && !planReadOnly : false;
  $: {
    activityActionColumnDef = {
      cellClass: 'action-cell-container',
      cellRenderer: (params: ActivityCellRendererParams) => {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions-cell';
        new DataGridActions({
          props: {
            deleteCallback: params.deleteActivityDirective,
            deleteTooltip: {
              content: 'Delete Activity Directive',
              placement: 'bottom',
            },
            hasDeletePermission,
            planReadOnly,
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
      suppressMovable: true,
      suppressSizeToFit: true,
      width: 25,
    };
    completeColumnDefs = [...(columnDefs ?? []), activityActionColumnDef];
  }

  async function deleteActivityDirective({ id, plan_id }: ActivityDirective) {
    if (!isDeletingDirective) {
      isDeletingDirective = true;
      await effects.deleteActivityDirective(plan_id, id, user);
      isDeletingDirective = false;
    }
  }

  async function deleteActivityDirectives({ detail: activities }: CustomEvent<ActivityDirective[]>) {
    if (!isDeletingDirective && plan !== null) {
      isDeletingDirective = true;
      const ids = activities.map(({ id }) => id);
      await effects.deleteActivityDirectives(plan.id, ids, user);
      isDeletingDirective = false;
    }
  }

  function getRowId(activityDirective: ActivityDirective): ActivityDirectiveId {
    return activityDirective.id;
  }
</script>

<BulkActionDataGrid
  bind:dataGrid
  bind:selectedItemId={selectedActivityDirectiveId}
  autoSizeColumnsToFit={false}
  columnDefs={completeColumnDefs}
  {columnStates}
  {getRowId}
  {planReadOnly}
  {hasDeletePermission}
  items={activityDirectives}
  pluralItemDisplayText="Activity Directives"
  scrollToSelection={true}
  singleItemDisplayText="Activity Directive"
  suppressDragLeaveHidesColumns={false}
  {user}
  on:bulkDeleteItems={deleteActivityDirectives}
  on:columnStateChange
  on:selectionChanged
  on:rowDoubleClicked
/>
