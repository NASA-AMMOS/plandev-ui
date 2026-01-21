<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Scheduling from '../../components/scheduling/Scheduling.svelte';
  import { getUserStore } from '../../stores/user';

  const user = getUserStore();
</script>

<PageTitle title="Scheduling" />

<Scheduling user={$user} />
