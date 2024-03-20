<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Scheduling from '../../components/scheduling/Scheduling.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="Scheduling" />

<Scheduling user={data.user} />
