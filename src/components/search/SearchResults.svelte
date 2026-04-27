<svelte:options immutable={true} />

<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';
  import { hasSearched, PAGE_SIZE, searchCurrentPage, searchOrderBy, searchTotalCount } from '../../stores/search';
  import type { ActivityDirectiveSearchResult } from '../../types/activity';
  import type { User } from '../../types/app';
  import { getShortISOForDate } from '../../utilities/time';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let user: User | null;
  export let activities: ActivityDirectiveSearchResult[] | null;
  export let onPageChange: (page: number) => void = () => {};
  export let onSortChange: () => void = () => {};

  const columnDefs = [
    {
      field: 'name',
      headerName: 'Activity Name',
      minWidth: 120,
      resizable: true,
      sortable: true,
    },
    {
      field: 'type',
      headerName: 'Activity Type',
      minWidth: 120,
      resizable: true,
      sortable: true,
    },
    {
      field: 'plan.name',
      headerName: 'Plan Name',
      minWidth: 120,
      resizable: true,
      sortable: true,
    },
    {
      field: 'plan.owner',
      headerName: 'Plan Owner',
      minWidth: 100,
      resizable: true,
      sortable: true,
      width: 100,
    },
    {
      field: 'applied_preset.preset_applied.name',
      headerName: 'Applied Preset',
      minWidth: 120,
      resizable: true,
      sortable: true,
    },
    {
      field: 'start_offset',
      headerName: 'Start Offset',
      minWidth: 100,
      resizable: true,
      sortable: true,
    },
    {
      field: 'created_by',
      headerName: 'Created By',
      minWidth: 100,
      resizable: true,
      sortable: true,
    },
    {
      field: 'last_modified_at',
      headerName: 'Last Modified',
      minWidth: 140,
      resizable: true,
      sort: 'desc' as const,
      sortable: true,
      valueFormatter: (params: { value: string }) => (params.value ? getShortISOForDate(new Date(params.value)) : ''),
    },
    {
      field: 'last_modified_by',
      headerName: 'Modified By',
      minWidth: 100,
      resizable: true,
      sortable: true,
    },
    {
      field: 'source_scheduling_goal_id',
      headerName: 'Sched. Goal ID',
      minWidth: 100,
      resizable: true,
      sortable: true,
    },
  ];

  $: totalPages = Math.max(1, Math.ceil($searchTotalCount / PAGE_SIZE));
  $: currentPage = $searchCurrentPage;
  $: startResult = $searchTotalCount > 0 ? currentPage * PAGE_SIZE + 1 : 0;
  $: endResult = Math.min((currentPage + 1) * PAGE_SIZE, $searchTotalCount);

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

  function goToPage(page: number) {
    if (page >= 0 && page < totalPages) {
      onPageChange(page);
    }
  }
</script>

<Panel overflowYBody="hidden">
  <svelte:fragment slot="header">
    <div class="flex items-center justify-between">
      <SectionTitle>Results</SectionTitle>
      {#if $hasSearched && $searchTotalCount > 0}
        <span class="text-xs text-muted-foreground">
          {startResult}-{endResult} of {$searchTotalCount.toLocaleString()}
        </span>
      {/if}
    </div>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <div class="flex h-full flex-col">
      <div class="min-h-0 flex-1">
        <SingleActionDataGrid
          idKey="directive_id"
          {columnDefs}
          items={activities ?? []}
          {user}
          itemDisplayText="Search Results"
          on:rowClicked={onRowClicked}
          on:sortChanged={onGridSortChanged}
          hasDeletePermission={false}
          loading={$hasSearched && activities === null}
          noRowsOverlayText="No Results Found"
        />
      </div>

      {#if $hasSearched && $searchTotalCount > PAGE_SIZE}
        <div class="flex items-center justify-center gap-2 border-t border-border px-3 py-2">
          <Button
            size="xs"
            variant="ghost"
            disabled={currentPage === 0}
            on:click={() => goToPage(0)}
            aria-label="First page"
          >
            First
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={currentPage === 0}
            on:click={() => goToPage(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </Button>
          <span class="text-xs">
            Page {currentPage + 1} of {totalPages.toLocaleString()}
          </span>
          <Button
            size="xs"
            variant="ghost"
            disabled={currentPage >= totalPages - 1}
            on:click={() => goToPage(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </Button>
          <Button
            size="xs"
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
