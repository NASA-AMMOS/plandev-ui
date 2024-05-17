<svelte:options immutable={true} />

<script lang="ts">
  import ParcelForm from '../../../../components/parcels/ParcelForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<ParcelForm
  initialParcelChannelDictionaryId={data.initialParcel.channel_dictionary_id}
  initialParcelCommandDictionaryId={data.initialParcel.command_dictionary_id}
  initialParcelCreatedAt={data.initialParcel.created_at}
  initialParcelId={data.initialParcel.id}
  initialParcelName={data.initialParcel.name}
  initialParcelOwner={data.initialParcel.owner}
  initialSequenceAdaptationId={data.initialParcel.sequence_adaptation_id}
  mode="edit"
  user={data.user}
/>
