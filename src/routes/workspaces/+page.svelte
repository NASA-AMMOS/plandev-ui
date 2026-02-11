<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Workspaces from '../../components/workspace/Workspaces.svelte';
  import { getUserStore } from '../../stores/user';

  const user = getUserStore();
</script>

<PageTitle title="Workspaces" />

<Workspaces user={$user} />
