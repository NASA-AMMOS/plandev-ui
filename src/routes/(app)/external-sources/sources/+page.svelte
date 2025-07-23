<svelte:options immutable={true} />

<script lang="ts">
  import { onDestroy } from 'svelte';
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import ExternalSourceManager from '../../../components/external-source/ExternalSourceManager.svelte';
  import { resetExternalSourceStores } from '../../../stores/external-source';
  import type { PageData } from './$types';

  export let data: PageData;

  onDestroy(() => {
    resetExternalSourceStores();
  });
</script>

<PageTitle title="External Sources" />

<ExternalSourceManager user={data.user}></ExternalSourceManager>
