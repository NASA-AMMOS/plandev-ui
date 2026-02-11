<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import ParcelForm from '../../../components/parcels/ParcelForm.svelte';
  import { getUserStore } from '../../../stores/user';

  const user = getUserStore();

  function onParcelSave(event: CustomEvent<{ parcelId: number }>) {
    goto(`${base}/parcels/edit/${event.detail.parcelId}`);
  }
</script>

<ParcelForm mode="create" user={$user} on:save={onParcelSave} />
