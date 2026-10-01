<svelte:options immutable={true} />

<script lang="ts">
  import { Tabs } from '@nasa-jpl/stellar-svelte';
  import type { ICellRendererParams, IRowNode } from 'ag-grid-community';
  import { getContext } from 'svelte';
  import type { ActivityStatusCategories, ActivityStatusCounts, ActivityStatusRollup } from '../../../types/console';
  import type { DataGridColumnDef } from '../../../types/data-grid';
  import EmptyState from '../../console/EmptyState.svelte';
  import ActivityStatusesRollup from '../../ui/ActivityStatusesRollup.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';
  import { ConsoleContextKey, type ConsoleContext } from '../Console.svelte';

  type ActivityErrorsRollupRendererParams = ICellRendererParams<ActivityStatusRollup>;

  export let activityValidationStatusRollups: ActivityStatusRollup[] = [];
  export let activityValidationStatusTotalRollup: ActivityStatusCounts;

  // Get state from context
  const consoleContext = getContext<ConsoleContext>(ConsoleContextKey);
  const filterStore = consoleContext?.filter;

  let activityValidationErrorsTotalRollup: ActivityStatusCounts = {
    extra: 0,
    invalidAnchor: 0,
    invalidParameter: 0,
    missing: 0,
    outOfBounds: 0,
    pending: 0,
    wrongType: 0,
  };
  let activityValidationErrorRollups: ActivityStatusRollup[] = [];

  $: hasErrors = activityValidationStatusRollups.length > 0;

  // Remove unavailable from total rollup as we don't want to show any unavailable activities in the errors view
  $: activityValidationErrorsTotalRollup = {
    ...activityValidationStatusTotalRollup,
    unavailable: 0,
  };
  function doesExternalFilterPass({ data }: IRowNode<ActivityStatusRollup>) {
    if (data) {
      switch (selectedCategory) {
        case 'extra':
          return (data.statusCounts?.extra ?? 0) > 0;
        case 'invalidParameter':
          return (data.statusCounts?.invalidParameter ?? 0) > 0;
        case 'missing':
          return (data.statusCounts?.missing ?? 0) > 0;
        case 'wrongType':
          return (data.statusCounts?.wrongType ?? 0) > 0;
        case 'invalidAnchor':
          return (data.statusCounts?.invalidAnchor ?? 0) > 0;
        case 'pending':
          return (data.statusCounts?.pending ?? 0) > 0;
        case 'outOfBounds':
          return (data.statusCounts?.outOfBounds ?? 0) > 0;
        default:
          return !data.statusCounts;
      }
    }
    return false;
  }

  function isExternalFilterPresent() {
    return selectedCategory !== 'all';
  }

  function onSelectCategory(event: CustomEvent<ActivityStatusCategories>) {
    const { detail: value } = event;
    if (value != null) {
      selectedCategory = value;
    }

    dataGrid.onFilterChanged();
  }

  const columnDefs: DataGridColumnDef<ActivityStatusRollup>[] = [
    {
      field: 'type',
      filter: 'string',
      headerName: 'Activity',
      resizable: true,
      sortable: true,
      width: 60,
    },
    {
      field: 'id',
      filter: 'number',
      headerName: 'ID',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      width: 60,
    },
    {
      filter: 'number',
      headerName: '# fields',
      resizable: true,
      sortable: true,
      suppressAutoSize: true,
      suppressSizeToFit: true,
      valueGetter: ({ data }) => {
        return `${data?.location.length ? data.location.length : ''}`;
      },
      width: 95,
    },
    {
      field: 'location',
      filter: 'string',
      headerName: 'Location',
      resizable: true,
      sortable: true,
      valueFormatter: ({ data }) => {
        return data?.location.join(', ') ?? '';
      },
      width: 80,
    },
    {
      autoHeight: true,
      cellRenderer: (params: ActivityErrorsRollupRendererParams) => {
        const issuesDiv = document.createElement('div');
        issuesDiv.className = 'issues-cell';
        new ActivityStatusesRollup({
          props: {
            counts: params.value,
            mode: 'compact',
            selectable: false,
          },
          target: issuesDiv,
        });

        return issuesDiv;
      },
      field: 'statusCounts',
      headerName: 'Issue',
      resizable: true,
      sortable: false,
      width: 80,
    },
  ];

  let dataGrid: DataGrid<ActivityStatusRollup>;
  let selectedCategory: ActivityStatusCategories = 'all';
</script>

<Tabs.Content value="activity" class="mt-0 h-full overflow-hidden pb-2 pr-2 pt-2">
  {#if hasErrors}
    <div class="flex h-full flex-col overflow-hidden">
      <div class="grid min-h-0 flex-1 grid-cols-[240px_1fr] overflow-hidden bg-[var(--st-gray-15)]">
        <div class="overflow-y-auto pt-4">
          <ActivityStatusesRollup
            counts={activityValidationErrorsTotalRollup}
            selectable
            showTotalCount
            on:selectCategory={onSelectCategory}
          />
        </div>
        <div class="h-full min-h-0 overflow-hidden">
          <DataGrid
            filterExpression={$filterStore}
            bind:this={dataGrid}
            {columnDefs}
            rowData={activityValidationErrorRollups}
            rowHeight={34}
            rowSelection="single"
            {doesExternalFilterPass}
            {isExternalFilterPresent}
            on:selectionChanged
          />
        </div>
      </div>
    </div>
  {:else}
    <div class="flex h-full overflow-hidden">
      <EmptyState />
    </div>
  {/if}
</Tabs.Content>
