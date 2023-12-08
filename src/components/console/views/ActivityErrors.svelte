<svelte:options immutable={true} />

<script lang="ts">
  import type { ICellRendererParams, IRowNode } from 'ag-grid-community';
  import type { DataGridColumnDef } from '../../../types/data-grid';
  import type { ActivityErrorCategories, ActivityErrorCounts, ActivityErrorRollup } from '../../../types/errors';
  import ActivityErrorsRollup from '../../ui/ActivityErrorsRollup.svelte';
  import DataGrid from '../../ui/DataGrid/DataGrid.svelte';
  import TabPanel from '../../ui/Tabs/TabPanel.svelte';
  import { ConsoleContextKey } from '../Console.svelte';

  type ActivityErrorsRollupRendererParams = ICellRendererParams<ActivityErrorRollup>;

  export let activityValidationErrorRollups: ActivityErrorRollup[] = [];
  export let activityValidationErrorTotalRollup: ActivityErrorCounts;
  export let title: string;

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
      field: 'fields',
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

<TabPanel tabContextKey={ConsoleContextKey}>
  <div class="activity-errors-container">
    <div class="console-header">
      <div>{title}</div>
    </div>
    <div class="errors">
      <div class="rollups">
        <ActivityErrorsRollup
          counts={activityValidationErrorTotalRollup}
          selectable
          showTotalCount
          on:selectCategory={onSelectCategory}
        />
      </div>
      <div class="errors-table">
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
</TabPanel>

<style>
  .activity-errors-container {
    display: grid;
    grid-template-rows: min-content auto;
    height: 100%;
  }

  .console-header {
    color: var(--st-gray-60);
    display: grid;
    font-size: 11px;
    font-weight: 700;
    grid-template-columns: auto min-content;
    justify-content: space-between;
    line-height: 1rem;
    margin: 0.65rem 1rem;
    text-transform: uppercase;
  }

  .errors {
    background-color: var(--st-primary-background-color);
    display: grid;
    grid-template-columns: 240px auto;
  }

  .rollups {
    border-right: 1px solid var(--st-gray-20, #ebecec);
    padding-top: 1rem;
  }
</style>
