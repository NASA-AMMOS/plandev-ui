<svelte:options immutable={true} />

<script lang="ts">
  import { hasSearched, searchResults } from '../../stores/search';
  import type { ActivityDirectiveSearchResult } from '../../types/activity';
  import type { User } from '../../types/app';
  import SingleActionDataGrid from '../ui/DataGrid/SingleActionDataGrid.svelte';
  import Panel from '../ui/Panel.svelte';
  import SectionTitle from '../ui/SectionTitle.svelte';

  export let user: User | null;
  export let activities: ActivityDirectiveSearchResult[] | null = $searchResults;

  const columnDefs = [
    {
      field: 'name',
      headerName: 'Activity Directive Name',
    },
    {
      field: 'type',
      headerName: 'Activity Type',
    },
    {
      field: 'plan.name',
      headerName: 'Plan Name',
    },
  ];

  function getUrlForActivity(activity: ActivityDirectiveSearchResult): string {
    return `/plans/${activity.plan_id}?activityId=${activity.directive_id}`;
  }

  function onRowClicked(event: CustomEvent) {
    const activity: ActivityDirectiveSearchResult = event.detail.data;
    const url = getUrlForActivity(activity);
    window.open(url, '_blank');
  }
</script>

<Panel overflowYBody="hidden">
  <svelte:fragment slot="header">
    <SectionTitle>Results</SectionTitle>
  </svelte:fragment>

  <svelte:fragment slot="body">
    <SingleActionDataGrid
      idKey="directive_id"
      {columnDefs}
      items={activities ?? []}
      {user}
      itemDisplayText="Search Results"
      on:rowClicked={onRowClicked}
      hasDeletePermission={false}
      loading={$hasSearched && activities === null}
      noRowsOverlayText="No Results Found"
    />
  </svelte:fragment>
</Panel>
