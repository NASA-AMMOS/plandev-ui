<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Search from '../../components/search/Search.svelte';
  import { getUserStore } from '../../stores/user';

  const user = getUserStore();
</script>

<PageTitle title="Search" />

<Search user={$user} />
