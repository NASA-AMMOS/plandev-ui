<svelte:options immutable={true} />

<script lang="ts">
  import SequenceForm from '../../../../components/sequencing/SequenceForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<SequenceForm
  initialSequenceCreatedAt={data.initialSequence.created_at}
  initialSequenceDefinition={data.initialSequence.definition}
  initialSequenceName={data.initialSequence.name}
  initialSequenceOwner={data.initialSequence.owner}
  initialSequenceParcelId={data.initialSequence.parcel_id}
  initialSequenceId={data.initialSequence.id}
  initialSequenceUpdatedAt={data.initialSequence.updated_at}
  mode="edit"
  user={data.user}
/>
