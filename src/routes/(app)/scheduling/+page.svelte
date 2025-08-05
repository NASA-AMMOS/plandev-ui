<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import Scheduling from '../../../components/scheduling/Scheduling.svelte';
  import { userStore } from '../../../lib/stores/auth';
</script>

<PageTitle title="Scheduling" />

<Scheduling user={$userStore} />
