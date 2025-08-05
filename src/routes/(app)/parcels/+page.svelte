<svelte:options immutable={true} />

<script lang="ts">
  import PageTitle from '../../../components/app/PageTitle.svelte';
  import Parcels from '../../../components/parcels/Parcels.svelte';
  import { userStore } from '../../../lib/stores/auth';
</script>

<PageTitle title="Parcels" />

<Parcels user={$userStore} />
