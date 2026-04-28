<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import type { ColumnState } from 'ag-grid-community';
  import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-svelte';
  import { SEARCH_RESULTS_COLUMN_STATE_KEY } from '../../constants/localStorage';
  import {
    hasSearched,
    isSearching,
    PAGE_SIZE,
    searchCurrentPage,
    searchOrderBy,
    searchRunId,
    searchTotalCount,
  } from '../../stores/search';
  import type { ActivityDirectiveSearchResult } from '../../types/activity';
  import type { User } from '../../types/app';
  import { getLocalStorageItem } from '../../utilities/localStorage';
  import { getShortISOForDate } from '../../utilities/time';
  import ActivityTableMenu from '../activity/ActivityTableMenu.svelte';
  import DataGrid from '../ui/DataGrid/DataGrid.svelte';
  import { tagsCellRenderer, tagsFilterValueGetter } from '../ui/DataGrid/DataGridTags';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let user: User | null;
  export let activities: ActivityDirectiveSearchResult[] | null;
  export let onPageChange: (page: number) => void = () => {};
  export let onSortChange: () => void = () => {};

  let resultsGrid: SingleActionDataGrid<ActivityDirectiveSearchResult> | undefined;
  $: dataGrid = resultsGrid?.dataGrid as DataGrid<ActivityDirectiveSearchResult> | undefined;

  const formatTimestamp = (params: { value: string }) =>
    params.value ? getShortISOForDate(new Date(params.value)) : '';

  const argumentsValueGetter = (params: { data?: ActivityDirectiveSearchResult }) => {
    const args = params.data?.arguments;
    if (!args || Object.keys(args).length === 0) {
      return '';
    }
    return JSON.stringify(args);
  };

  const columnDefs = [
    {
      colId: 'name',
      field: 'name',
      headerName: 'Activity Name',
      hide: false,
      minWidth: 120,
      resizable: true,
      sortable: true,
    },
    {
      colId: 'type',
      field: 'type',
      headerName: 'Activity Type',
      hide: false,
      minWidth: 120,
      resizable: true,
      sortable: true,
    },
    {
      colId: 'plan.name',
      field: 'plan.name',
      headerName: 'Plan Name',
      hide: false,
      minWidth: 120,
      resizable: true,
      sortable: true,
    },
    {
      colId: 'plan.owner',
      field: 'plan.owner',
      headerName: 'Plan Owner',
      hide: false,
      minWidth: 100,
      resizable: true,
      sortable: true,
      width: 100,
    },
    {
      colId: 'applied_preset.preset_applied.name',
      field: 'applied_preset.preset_applied.name',
      headerName: 'Applied Preset',
      hide: false,
      minWidth: 120,
      resizable: true,
      sortable: true,
    },
    {
      colId: 'start_offset',
      field: 'start_offset',
      headerName: 'Start Offset',
      hide: false,
      minWidth: 100,
      resizable: true,
      sortable: true,
    },
    {
      autoHeight: true,
      cellRenderer: tagsCellRenderer,
      colId: 'tags',
      field: 'tags',
      filterValueGetter: tagsFilterValueGetter,
      headerName: 'Tags',
      hide: false,
      minWidth: 120,
      resizable: true,
      sortable: false,
      width: 200,
    },
    {
      colId: 'arguments',
      field: 'arguments',
      headerName: 'Arguments',
      hide: true,
      minWidth: 160,
      resizable: true,
      sortable: false,
      valueGetter: argumentsValueGetter,
      width: 240,
    },
    {
      colId: 'created_by',
      field: 'created_by',
      headerName: 'Created By',
      hide: false,
      minWidth: 100,
      resizable: true,
      sortable: true,
    },
    {
      colId: 'created_at',
      field: 'created_at',
      headerName: 'Created At',
      hide: true,
      minWidth: 140,
      resizable: true,
      sortable: true,
      valueFormatter: formatTimestamp,
    },
    {
      colId: 'last_modified_at',
      field: 'last_modified_at',
      headerName: 'Last Modified',
      hide: false,
      minWidth: 140,
      resizable: true,
      sort: 'desc' as const,
      sortable: true,
      valueFormatter: formatTimestamp,
    },
    {
      colId: 'last_modified_by',
      field: 'last_modified_by',
      headerName: 'Modified By',
      hide: false,
      minWidth: 100,
      resizable: true,
      sortable: true,
    },
    {
      colId: 'source_scheduling_goal_id',
      field: 'source_scheduling_goal_id',
      headerName: 'Sched. Goal ID',
      hide: false,
      minWidth: 100,
      resizable: true,
      sortable: true,
    },
    {
      colId: 'plan_id',
      field: 'plan_id',
      headerName: 'Plan ID',
      hide: true,
      minWidth: 80,
      resizable: true,
      sortable: true,
    },
    {
      colId: 'directive_id',
      field: 'directive_id',
      headerName: 'Activity ID',
      hide: true,
      minWidth: 80,
      resizable: true,
      sortable: true,
    },
    // Disable AG Grid's client-side sort on every sortable column — sorting is server-side,
    // and a no-op local comparator avoids the flash where the visible page would briefly
    // re-order with the local rows before the server response replaces them.
  ].map(col => ('sortable' in col && col.sortable ? { ...col, comparator: () => 0 } : col));

  const savedColumnStates = getLocalStorageItem<ColumnState[]>(SEARCH_RESULTS_COLUMN_STATE_KEY) ?? [];
  let columnStates: ColumnState[] = savedColumnStates;

  $: totalPages = Math.max(1, Math.ceil($searchTotalCount / PAGE_SIZE));
  $: currentPage = $searchCurrentPage;
  $: startResult = $searchTotalCount > 0 ? currentPage * PAGE_SIZE + 1 : 0;
  $: endResult = Math.min((currentPage + 1) * PAGE_SIZE, $searchTotalCount);

  // Show "Searching..." only when the request takes longer than 500ms (avoids flash on fast responses)
  let showSearchingIndicator = false;
  let searchingTimeout: ReturnType<typeof setTimeout> | undefined;
  $: {
    clearTimeout(searchingTimeout);
    if ($isSearching) {
      searchingTimeout = setTimeout(() => {
        showSearchingIndicator = true;
      }, 500);
    } else {
      showSearchingIndicator = false;
    }
  }

  function getUrlForActivity(activity: ActivityDirectiveSearchResult): string {
    return `/plans/${activity.plan_id}?activityId=${activity.directive_id}`;
  }

  function onRowClicked(event: CustomEvent) {
    const activity: ActivityDirectiveSearchResult = event.detail.data;
    const url = getUrlForActivity(activity);
    window.open(url, '_blank');
  }

  function fieldToOrderBy(field: string, direction: string): Record<string, unknown> {
    const parts = field.split('.');
    let result: Record<string, unknown> = { [parts[parts.length - 1]]: direction };
    for (let i = parts.length - 2; i >= 0; i--) {
      result = { [parts[i]]: result };
    }
    return result;
  }

  function onGridSortChanged(event: CustomEvent) {
    const api = event.detail.api;
    const sortModel = api.getColumnState().filter((c: { sort: string | null }) => c.sort !== null);

    if (sortModel.length > 0) {
      const orderBy = sortModel.map((col: { colId: string; sort: string }) => fieldToOrderBy(col.colId, col.sort));
      searchOrderBy.set(orderBy);
    } else {
      searchOrderBy.set([{ last_modified_at: 'desc' }]);
    }

    onSortChange();
  }

  // Track grid's live column state (for menu rendering); DataGrid handles localStorage save/clear itself.
  function onGridColumnStateChange(event: CustomEvent<ColumnState[] | undefined>) {
    if (event.detail) {
      columnStates = event.detail;
    }
  }

  function onColumnsChanged({
    detail: { columns },
  }: CustomEvent<{ columns: { field: any; isHidden: boolean; name: string }[] }>) {
    const current = dataGrid?.getColumnState() ?? [];
    columnStates = current.map(state => ({
      ...state,
      hide: columns.find(c => c.field === state.colId)?.isHidden ?? state.hide,
    }));
  }

  function onShowHideAllColumns({ detail: { hide } }: CustomEvent<{ hide: boolean }>) {
    const current = dataGrid?.getColumnState() ?? [];
    columnStates = current.map(state => ({ ...state, hide }));
  }

  function onResetColumnsFromMenu() {
    dataGrid?.resetColumns();
  }

  function goToPage(page: number) {
    if (page >= 0 && page < totalPages) {
      onPageChange(page);
    }
  }
</script>

<Panel overflowYBody="hidden">
  <svelte:fragment slot="header">
    <div class="flex w-full items-center justify-between gap-2">
      <SectionTitle>Search Results</SectionTitle>
      <div class="flex items-center gap-2">
        {#if showSearchingIndicator}
          <span class="text-xs text-muted-foreground">Searching…</span>
        {:else if $hasSearched && $searchTotalCount > 0}
          <span class="text-xs text-muted-foreground">
            {startResult}-{endResult} of {$searchTotalCount.toLocaleString()}
          </span>
        {/if}
        <ActivityTableMenu
          {columnDefs}
          {columnStates}
          on:columns-changed={onColumnsChanged}
          on:columns-reset={onResetColumnsFromMenu}
          on:show-hide-all-columns={onShowHideAllColumns}
        />
      </div>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <div class="flex h-full flex-col" data-search-run-id={$searchRunId}>
      <div class="relative min-h-0 flex-1">
        {#if showSearchingIndicator}
          <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <LoaderCircle size={32} class="animate-spin text-muted-foreground" />
          </div>
        {/if}
        <SingleActionDataGrid
          bind:this={resultsGrid}
          idKey="directive_id"
          {columnDefs}
          {columnStates}
          persistColumnStateKey={SEARCH_RESULTS_COLUMN_STATE_KEY}
          items={activities ?? []}
          {user}
          itemDisplayText="Search Results"
          on:rowClicked={onRowClicked}
          on:sortChanged={onGridSortChanged}
          on:columnStateChange={onGridColumnStateChange}
          hasDeletePermission={false}
          loading={$hasSearched && activities === null}
          noRowsOverlayText="No Results Found"
        />
      </div>

      {#if $hasSearched && $searchTotalCount > PAGE_SIZE}
        <div class="flex items-center justify-center gap-2 border-t border-border px-3 pb-1 pt-2">
          <Button variant="ghost" disabled={currentPage === 0} on:click={() => goToPage(0)} aria-label="First page">
            First
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={currentPage === 0}
            on:click={() => goToPage(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </Button>
          <span class="text-xs">
            Page {currentPage + 1} of {totalPages.toLocaleString()}
          </span>
          <Button
            size="icon"
            variant="ghost"
            disabled={currentPage >= totalPages - 1}
            on:click={() => goToPage(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="ghost"
            disabled={currentPage >= totalPages - 1}
            on:click={() => goToPage(totalPages - 1)}
            aria-label="Last page"
          >
            Last
          </Button>
        </div>
      {/if}
    </div>
  </svelte:fragment>
</Panel>
