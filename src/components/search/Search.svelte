<svelte:options immutable={true} />

<script lang="ts">
  import { searchColumns, searchResults } from '../../stores/search';
  import type { User } from '../../types/app';
  import CssGrid from '../ui/CssGrid.svelte';
  import CssGridGutter from '../ui/CssGridGutter.svelte';
  import SearchPanel from './SearchPanel.svelte';
  import SearchResults from './SearchResults.svelte';

  export let user: User | null;
</script>

<CssGrid columns={$searchColumns}>
  <SearchPanel {user} />

  <CssGridGutter track={1} type="column" />

  <SearchResults {user} activities={$searchResults} />
</CssGrid>
