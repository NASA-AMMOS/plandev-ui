<svelte:options immutable={true} />

<script lang="ts">
  import { onDestroy } from 'svelte';
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import ExternalSourceManager from '../../../components/external-source/ExternalSourceManager.svelte';
  import { resetExternalSourceStores } from '../../../stores/external-source';
  import { getUserStore } from '../../../stores/user';

  const user = getUserStore();

  onDestroy(() => {
    resetExternalSourceStores();
  });
</script>

<PageTitle title="External Sources" />

<ExternalSourceManager user={$user}></ExternalSourceManager>
