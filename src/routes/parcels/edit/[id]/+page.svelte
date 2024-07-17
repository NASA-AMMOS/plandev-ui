<svelte:options immutable={true} />

<script lang="ts">
  import ParcelForm from '../../../../components/parcels/ParcelForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<ParcelForm
  mode="edit"
  parcelChannelDictionaryId={data.initialParcel.channel_dictionary_id}
  parcelCommandDictionaryId={data.initialParcel.command_dictionary_id}
  parcelCreatedAt={data.initialParcel.created_at}
  parcelId={data.initialParcel.id}
  parcelName={data.initialParcel.name}
  parcelOwner={data.initialParcel.owner}
  parcelSequenceAdaptationId={data.initialParcel.sequence_adaptation_id}
  user={data.user}
/>
