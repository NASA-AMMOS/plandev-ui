<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import ParcelForm from '../../../components/parcels/ParcelForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  function onParcelSave(event: CustomEvent<{ parcelId: number }>) {
    goto(`${base}/parcels/edit/${event.detail.parcelId}`);
  }
</script>

<ParcelForm mode="create" user={data.user} on:save={onParcelSave} />
