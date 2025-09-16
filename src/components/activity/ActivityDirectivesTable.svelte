<svelte:options immutable={true} />

<script lang="ts">
  import { ContextMenu } from '@nasa-jpl/stellar-svelte';
  import type { ColDef, ColumnState, ICellRendererParams } from 'ag-grid-community';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import type { ActivityDirective, ActivityDirectiveId } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { DataGridColumnDef } from '../../types/data-grid';
  import type { ActivityErrorCounts, ActivityErrorRollup } from '../../types/errors';
  import type { Plan } from '../../types/plan';
  import { copyActivityDirectivesToClipboard } from '../../utilities/activities';
  import effects from '../../utilities/effects';
  import { featurePermissions } from '../../utilities/permissions';
  import ActivityErrorsRollup from '../ui/ActivityErrorsRollup.svelte';
  import BulkActionDataGrid from '../ui/DataGrid/BulkActionDataGrid.svelte';
  import type DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import DataGridActions from '../ui/DataGrid/DataGridActions.svelte';
  import PasteActivitiesContextMenu from './PasteActivitiesContextMenu.svelte';

  export let activityDirectives: ActivityDirective[] | null = null;
  export let activityDirectiveErrorRollupsMap: Record<ActivityDirectiveId, ActivityErrorRollup> | undefined = undefined;
  export let showBulkShiftMenu: boolean = true;
  export let columnDefs: ColDef[];
  export let columnStates: ColumnState[] = [];
  export let dataGrid: DataGrid<ActivityDirective> | undefined = undefined;
  export let plan: Plan | null;
  export let selectedActivityDirectiveId: ActivityDirectiveId | null = null;
  export let bulkSelectedActivityDirectiveIds: ActivityDirectiveId[] = [];
  export let planReadOnly: boolean = false;
  export let user: User | null;
  export let filterExpression: string = '';

  let showPackLeftMenu: boolean = true;
  let showPackRightMenu: boolean = bulkSelectedActivityDirectiveIds.length > 1;
  let showPackOffsetMenu: boolean = bulkSelectedActivityDirectiveIds.length > 1;
  $: showPackLeftMenu = bulkSelectedActivityDirectiveIds.length > 1;
  $: showPackRightMenu = bulkSelectedActivityDirectiveIds.length > 1;
  $: showPackOffsetMenu = bulkSelectedActivityDirectiveIds.length > 1;

  const pluralItemDisplayText: string = 'Activity Directives';
  const singleItemDisplayText: string = 'Activity Directive';

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
  let permissionErrorText: string | null = null;

  $: hasDeletePermission =
    plan !== null ? featurePermissions.activityDirective.canDelete(user, plan) && !planReadOnly : false;

  $: hasCreatePermission =
    plan !== null ? featurePermissions.activityDirective.canCreate(user, plan) && !planReadOnly : false;

  $: activityDirectivesWithErrorCounts = (activityDirectives || []).map(activityDirective => ({
    ...activityDirective,
    errorCounts: activityDirectiveErrorRollupsMap?.[activityDirective.id]?.errorCounts,
  }));

  $: {
    if (planReadOnly) {
      permissionErrorText = PlanStatusMessages.READ_ONLY;
    } else if (!hasCreatePermission) {
      permissionErrorText = 'You do not have permission create activity directives';
    } else {
      permissionErrorText = null;
    }
  }

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

  async function bulkShiftItems() {
    const selectedIdSet = new Set(bulkSelectedActivityDirectiveIds);
    const selectedActivityDirectives = activityDirectives?.filter(ad => selectedIdSet.has(ad.id)) ?? [];

    if (selectedActivityDirectives.length && plan !== null) {
      await effects.shiftActivityDirectives(plan, selectedActivityDirectives, user);
    }
  }

  async function bulkPackLeftItems() {
    const selectedIdSet = new Set(bulkSelectedActivityDirectiveIds);
    const selectedActivityDirectives = activityDirectives?.filter(ad => selectedIdSet.has(ad.id)) ?? [];

    if (selectedActivityDirectives.length && plan !== null) {
      await effects.packActivityDirectives(plan, selectedActivityDirectives, 'LEFT', 0, user);
    }
  }

  async function bulkPackRightItems() {
    const selectedIdSet = new Set(bulkSelectedActivityDirectiveIds);
    const selectedActivityDirectives = activityDirectives?.filter(ad => selectedIdSet.has(ad.id)) ?? [];

    if (selectedActivityDirectives.length && plan !== null) {
      await effects.packActivityDirectives(plan, selectedActivityDirectives, 'RIGHT', 0, user);
    }
  }

  async function bulkPackItemsWithOffset() {
    const selectedIdSet = new Set(bulkSelectedActivityDirectiveIds);
    const selectedActivityDirectives = activityDirectives?.filter(ad => selectedIdSet.has(ad.id)) ?? [];

    if (selectedActivityDirectives.length && plan !== null) {
      await effects.packActivityDirectivesWithModal(plan, selectedActivityDirectives, user);
    }
  }

  function createActivityDirectives({ detail }: CustomEvent<ActivityDirective[]>) {
    dispatch('createActivityDirectives', detail);
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
  showCopyMenu={true}
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
      <ContextMenu.Item size="sm" on:click={scrollTimelineToActivityDirective}>Scroll to Activity</ContextMenu.Item>
      <ContextMenu.Separator />
    {/if}
    <PasteActivitiesContextMenu
      {hasCreatePermission}
      {plan}
      planPermissionErrorText={permissionErrorText}
      on:createActivityDirectives={createActivityDirectives}
    />
    <ContextMenu.Separator />
  </svelte:fragment>

  <svelte:fragment slot="context-menu-bottom">
    {#if showBulkShiftMenu}
      <ContextMenu.Item size="sm" on:click={bulkShiftItems}>
        Shift {bulkSelectedActivityDirectiveIds.length}
        {bulkSelectedActivityDirectiveIds.length > 1 ? pluralItemDisplayText : singleItemDisplayText}
      </ContextMenu.Item>
    {/if}

    {#if showPackLeftMenu}
      <ContextMenu.Item size="sm" on:click={bulkPackLeftItems}>
        Pack Left {bulkSelectedActivityDirectiveIds.length}
        {bulkSelectedActivityDirectiveIds.length > 1 ? pluralItemDisplayText : singleItemDisplayText}
      </ContextMenu.Item>
    {/if}

    {#if showPackRightMenu}
      <ContextMenu.Item size="sm" on:click={bulkPackRightItems}>
        Pack Right {bulkSelectedActivityDirectiveIds.length}
        {bulkSelectedActivityDirectiveIds.length > 1 ? pluralItemDisplayText : singleItemDisplayText}
      </ContextMenu.Item>
    {/if}

    {#if showPackOffsetMenu}
      <ContextMenu.Item size="sm" on:click={bulkPackItemsWithOffset}>
        Pack {bulkSelectedActivityDirectiveIds.length}
        {bulkSelectedActivityDirectiveIds.length > 1 ? pluralItemDisplayText : singleItemDisplayText} with Offset
      </ContextMenu.Item>
    {/if}
  </svelte:fragment>
</BulkActionDataGrid>
