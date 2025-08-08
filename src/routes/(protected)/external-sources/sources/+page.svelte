<svelte:options immutable={true} />

<script lang="ts">
  import { onDestroy } from 'svelte';
  import PageTitle from '../../../../components/app/PageTitle.svelte';
  import ExternalSourceManager from '../../../../components/external-source/ExternalSourceManager.svelte';
  import { userStore } from '../../../../lib/stores/auth';
  import { resetExternalSourceStores } from '../../../../stores/external-source';

  onDestroy(() => {
    resetExternalSourceStores();
  });
</script>

<PageTitle title="External Sources" />

<ExternalSourceManager user={$userStore}></ExternalSourceManager>
