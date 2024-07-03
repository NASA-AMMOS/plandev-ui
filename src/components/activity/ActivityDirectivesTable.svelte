<svelte:options immutable={true} />

<script lang="ts">
  import type { ColDef, ColumnState, ICellRendererParams } from 'ag-grid-community';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import type { ActivityDirective, ActivityDirectiveId } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ActivityErrorCounts, ActivityErrorRollup } from '../../types/errors';
  import type { Plan } from '../../types/plan';
  import effects from '../../utilities/effects';
  import { featurePermissions } from '../../utilities/permissions';
  import ActivityErrorsRollup from '../ui/ActivityErrorsRollup.svelte';
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';

  export let activityDirectives: ActivityDirective[] = [];
  export let activityDirectiveErrorRollupsMap: Record<ActivityDirectiveId, ActivityErrorRollup> | undefined = undefined;
  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let dataGrid: DataGrid<ActivityDirective> | undefined = undefined;
  export let plan: Plan | null;
  export let selectedActivityDirectiveId: ActivityDirectiveId | null = null;
  export let planReadOnly: boolean = false;
  export let user: User | null;
  export let filterExpression: string = '';

  type ActivityDirectiveWithErrorCounts = ActivityDirective & { errorCounts?: ActivityErrorCounts };
  type CellRendererParams = {
    deleteActivityDirective: (activity: ActivityDirective) => void;
  };
  type ActivityCellRendererParams = ICellRendererParams<ActivityDirective> & CellRendererParams;

  let activityActionColumnDef: DataGridColumnDef | null = null;
  let activityErrorColumnDef: DataGridColumnDef | null = null;
  let activityDirectivesWithErrorCounts: ActivityDirectiveWithErrorCounts[] = [];
  let completeColumnDefs: ColDef[] = columnDefs;
  let hasDeletePermission: boolean = false;
  let isDeletingDirective: boolean = false;

  $: hasDeletePermission =
    plan !== null ? featurePermissions.activityDirective.canDelete(user, plan) && !planReadOnly : false;
  $: activityDirectivesWithErrorCounts = activityDirectives.map(activityDirective => ({
    ...activityDirective,
    errorCounts: activityDirectiveErrorRollupsMap?.[activityDirective.id]?.errorCounts,
  }));
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
            hasDeletePermissionError: planReadOnly ? PlanStatusMessages.READ_ONLY : undefined,
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
      lockPosition: 'right',
      resizable: false,
      sortable: false,
      suppressAutoSize: true,
      suppressMovable: true,
      suppressSizeToFit: true,
      width: 25,
    };
    activityErrorColumnDef = {
      cellClass: 'error-cell-container',
      cellRenderer: (params: ActivityCellRendererParams) => {
        const issuesDiv = document.createElement('div');
        issuesDiv.className = 'issues-cell';

        new ActivityErrorsRollup({
          props: {
            counts: params.value,
            mode: 'iconsOnly',
            selectable: false,
          },
          target: issuesDiv,
        });

        return issuesDiv;
      },
      field: 'errorCounts',
      headerName: '',
      lockPosition: 'left',
      resizable: true,
      sortable: false,
      suppressMovable: true,
      suppressSizeToFit: true,
      width: 70,
    };
    completeColumnDefs = [activityErrorColumnDef, ...(columnDefs ?? []), activityActionColumnDef];
  }

  async function deleteActivityDirective({ id }: ActivityDirective) {
    if (!isDeletingDirective && plan !== null) {
      isDeletingDirective = true;
      await effects.deleteActivityDirective(id, plan, user);
      isDeletingDirective = false;
    }
  }

  async function deleteActivityDirectives({ detail: activities }: CustomEvent<ActivityDirective[]>) {
    if (!isDeletingDirective && plan !== null) {
      isDeletingDirective = true;
      const ids = activities.map(({ id }) => id);
      await effects.deleteActivityDirectives(ids, plan, user);
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
  {hasDeletePermission}
  hasDeletePermissionError={planReadOnly ? PlanStatusMessages.READ_ONLY : undefined}
  items={activityDirectivesWithErrorCounts}
  pluralItemDisplayText="Activity Directives"
  scrollToSelection={true}
  singleItemDisplayText="Activity Directive"
  suppressDragLeaveHidesColumns={false}
  {user}
  {filterExpression}
  on:bulkDeleteItems={deleteActivityDirectives}
  on:columnMoved
  on:columnPinned
  on:columnResized
  on:columnVisible
  on:gridSizeChanged
  on:selectionChanged
  on:rowDoubleClicked
/>
