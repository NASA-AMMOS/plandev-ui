<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Parcels from '../../components/parcels/Parcels.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<PageTitle title="Parcels" />

<Parcels user={data.user} />
