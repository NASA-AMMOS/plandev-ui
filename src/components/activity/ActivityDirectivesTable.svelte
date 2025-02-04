<svelte:options immutable={true} />

<script lang="ts">
  import type { ColDef, ColumnState, ICellRendererParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import type { ActivityDirective, ActivityDirectiveId } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ActivityErrorCounts, ActivityErrorRollup } from '../../types/errors';
  import type { Plan } from '../../types/plan';
  import {
    canPasteActivityDirectivesFromClipboard,
    copyActivityDirectivesToClipboard,
    getActivityDirectivesToPaste,
    getPasteActivityDirectivesText,
  } from '../../utilities/activities';
  import effects from '../../utilities/effects';
  import { featurePermissions } from '../../utilities/permissions';
  import ContextMenuItem from '../context-menu/ContextMenuItem.svelte';
  import ContextMenuSeparator from '../context-menu/ContextMenuSeparator.svelte';
  import ActivityErrorsRollup from '../ui/ActivityErrorsRollup.svelte';
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';

  export let activityDirectives: ActivityDirective[] | null = null;
  export let activityDirectiveErrorRollupsMap: Record<ActivityDirectiveId, ActivityErrorRollup> | undefined = undefined;
  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let dataGrid: DataGrid<ActivityDirective> | undefined = undefined;
  export let plan: Plan | null;
  export let selectedActivityDirectiveId: ActivityDirectiveId | null = null;
  export let bulkSelectedActivityDirectiveIds: ActivityDirectiveId[] = [];
  export let planReadOnly: boolean = false;
  export let user: User | null;
  export let filterExpression: string = '';

  const dispatch = createEventDispatcher<{
    createActivityDirectives: ActivityDirective[];
    scrollTimelineToTime: number;
  }>();

  type ActivityDirectiveWithErrorCounts = ActivityDirective & { errorCounts?: ActivityErrorCounts };
  type CellRendererParams = {
    deleteActivityDirective: (activity: ActivityDirective) => void;
  };
  type ActivityCellRendererParams = ICellRendererParams<ActivityDirective> & CellRendererParams;

  let activityActionColumnDef: DataGridColumnDef | null = null;
  let activityErrorColumnDef: DataGridColumnDef | null = null;
  let activityDirectivesWithErrorCounts: ActivityDirectiveWithErrorCounts[] = [];
  let completeColumnDefs: ColDef[] = columnDefs;
  let hasCreatePermission: boolean = false;
  let hasDeletePermission: boolean = false;
  let isDeletingDirective: boolean = false;
  let showCopyMenu: boolean = true;

  $: hasDeletePermission =
    plan !== null ? featurePermissions.activityDirective.canDelete(user, plan) && !planReadOnly : false;

  $: hasCreatePermission =
    plan !== null ? featurePermissions.activityDirective.canCreate(user, plan) && !planReadOnly : false;

  $: activityDirectivesWithErrorCounts = (activityDirectives || []).map(activityDirective => ({
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

  function scrollTimelineToActivityDirective() {
    const directiveId = bulkSelectedActivityDirectiveIds.length > 0 && bulkSelectedActivityDirectiveIds[0];
    const directive = (activityDirectives || []).find(item => item.id === directiveId) ?? null;
    if (directive?.start_time_ms !== undefined && directive?.start_time_ms !== null) {
      dispatch('scrollTimelineToTime', directive.start_time_ms);
    }
  }

  function copyActivityDirectives({ detail: activities }: CustomEvent<ActivityDirective[]>) {
    if (plan !== null) {
      copyActivityDirectivesToClipboard(plan, activities);
    }
  }

  function canPasteActivityDirectives(): boolean {
    return plan !== null && hasCreatePermission && canPasteActivityDirectivesFromClipboard(plan);
  }

  function pasteActivityDirectives() {
    if (plan !== null && canPasteActivityDirectives()) {
      const directives = getActivityDirectivesToPaste(plan);
      if (directives !== undefined) {
        dispatch(`createActivityDirectives`, directives);
      }
    }
  }
</script>

<BulkActionDataGrid
  bind:dataGrid
  bind:selectedItemId={selectedActivityDirectiveId}
  bind:selectedItemIds={bulkSelectedActivityDirectiveIds}
  autoSizeColumnsToFit={false}
  columnDefs={completeColumnDefs}
  {columnStates}
  {getRowId}
  loading={!activityDirectives}
  {hasDeletePermission}
  hasDeletePermissionError={planReadOnly ? PlanStatusMessages.READ_ONLY : undefined}
  items={activityDirectivesWithErrorCounts}
  pluralItemDisplayText="Activity Directives"
  scrollToSelection={true}
  singleItemDisplayText="Activity Directive"
  {showCopyMenu}
  suppressDragLeaveHidesColumns={false}
  {user}
  {filterExpression}
  on:bulkDeleteItems={deleteActivityDirectives}
  on:bulkCopyItems={copyActivityDirectives}
  on:columnMoved
  on:columnPinned
  on:columnResized
  on:columnVisible
  on:gridSizeChanged
  on:selectionChanged
  on:rowDoubleClicked
>
  <svelte:fragment slot="context-menu">
    {#if bulkSelectedActivityDirectiveIds.length === 1}
      <ContextMenuItem on:click={scrollTimelineToActivityDirective}>Scroll to Activity</ContextMenuItem>
      <ContextMenuSeparator></ContextMenuSeparator>
    {/if}
    {#if canPasteActivityDirectives()}
      <ContextMenuItem on:click={pasteActivityDirectives}>{getPasteActivityDirectivesText()}</ContextMenuItem>
      <ContextMenuSeparator></ContextMenuSeparator>
    {/if}
  </svelte:fragment>
</BulkActionDataGrid>
