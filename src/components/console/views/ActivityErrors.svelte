<svelte:options immutable={true} />

<script lang="ts">
  import { Tabs } from '@nasa-jpl/stellar-svelte';
  import type { ICellRendererParams, IRowNode } from 'ag-grid-community';
  import type { DataGridColumnDef } from '../../../types/data-grid';
  import type { ActivityErrorCategories, ActivityErrorCounts, ActivityErrorRollup } from '../../../types/errors';
  import EmptyState from '../../console/EmptyState.svelte';
  import ActivityErrorsRollup from '../../ui/ActivityErrorsRollup.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';

  type ActivityErrorsRollupRendererParams = ICellRendererParams<ActivityErrorRollup>;

  export let activityValidationErrorRollups: ActivityErrorRollup[] = [];
  export let activityValidationErrorTotalRollup: ActivityErrorCounts;

  $: hasErrors = activityValidationErrorRollups.length > 0;

  function doesExternalFilterPass({ data }: IRowNode<ActivityErrorRollup>) {
    if (data) {
      switch (selectedCategory) {
        case 'extra':
          return data.errorCounts.extra > 0;
        case 'invalidParameter':
          return data.errorCounts.invalidParameter > 0;
        case 'missing':
          return data.errorCounts.missing > 0;
        case 'wrongType':
          return data.errorCounts.wrongType > 0;
        case 'invalidAnchor':
          return data.errorCounts.invalidAnchor > 0;
        case 'pending':
          return data.errorCounts.pending > 0;
        case 'outOfBounds':
          return data.errorCounts.outOfBounds > 0;
      }
    }
    return false;
  }

  function isExternalFilterPresent() {
    return selectedCategory !== 'all';
  }

  function onSelectCategory(event: CustomEvent<ActivityErrorCategories>) {
    const { detail: value } = event;
    if (value != null) {
      selectedCategory = value;
    }

    dataGrid.onFilterChanged();
  }

  const columnDefs: DataGridColumnDef<ActivityErrorRollup>[] = [
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
        new ActivityErrorsRollup({
          props: {
            counts: params.value,
            mode: 'compact',
            selectable: false,
          },
          target: issuesDiv,
        });

        return issuesDiv;
      },
      field: 'errorCounts',
      headerName: 'Issue',
      resizable: true,
      sortable: false,
      width: 80,
    },
  ];

  let dataGrid: DataGrid<ActivityErrorRollup>;
  let selectedCategory: ActivityErrorCategories = 'all';
</script>

<Tabs.Content value="activity" class="mt-0 h-full overflow-hidden pb-2 pr-2 pt-2">
  {#if hasErrors}
    <div class="flex h-full flex-col overflow-hidden">
      <div class="grid min-h-0 flex-1 grid-cols-[240px_1fr] overflow-hidden bg-[var(--st-gray-15)]">
        <div class="overflow-y-auto border-r border-[var(--st-gray-20)] pt-4">
          <ActivityErrorsRollup
            counts={activityValidationErrorTotalRollup}
            selectable
            showTotalCount
            on:selectCategory={onSelectCategory}
          />
        </div>
        <div class="h-full min-h-0 overflow-hidden">
          <DataGrid
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
