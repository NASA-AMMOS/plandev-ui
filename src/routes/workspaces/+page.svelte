<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Workspaces from '../../components/workspace/Workspaces.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="Workspaces" />

<Workspaces user={data.user} />
