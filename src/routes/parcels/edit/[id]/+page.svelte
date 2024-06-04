<svelte:options immutable={true} />

<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import ParcelForm from '../../../../components/parcels/ParcelForm.svelte';
  import { parcelId } from '../../../../stores/sequencing';
  import type { PageData } from './$types';

  export let data: PageData;

  onMount(() => {
    $parcelId = data.initialParcel.id;
  });

  onDestroy(() => {
    $parcelId = null;
  });
</script>

<ParcelForm mode="edit" user={data.user} />
