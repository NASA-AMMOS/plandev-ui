<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import ExternalTypeManager from '../../../components/external-source/ExternalTypeManager.svelte';

  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="External Source & Event Types" />

<ExternalTypeManager user={data.user}></ExternalTypeManager>
