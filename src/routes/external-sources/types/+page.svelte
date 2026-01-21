<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import ExternalTypeManager from '../../../components/external-source/ExternalTypeManager.svelte';
  import { getUserStore } from '../../../stores/user';

  const user = getUserStore();
</script>

<PageTitle title="External Source & Event Types" />

<ExternalTypeManager user={$user}></ExternalTypeManager>
