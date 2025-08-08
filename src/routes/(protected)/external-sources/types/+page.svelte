<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../../components/app/PageTitle.svelte';
  import ExternalTypeManager from '../../../../components/external-source/ExternalTypeManager.svelte';
  import { userStore } from '../../../../lib/stores/auth';
</script>

<PageTitle title="External Source & Event Types" />

<ExternalTypeManager user={$userStore}></ExternalTypeManager>
