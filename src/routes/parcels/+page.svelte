<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../components/app/PageTitle.svelte';
  import Parcels from '../../components/parcels/Parcels.svelte';
  import { getUserStore } from '../../stores/user';

  const user = getUserStore();
</script>

<PageTitle title="Parcels" />

<Parcels user={$user} />
