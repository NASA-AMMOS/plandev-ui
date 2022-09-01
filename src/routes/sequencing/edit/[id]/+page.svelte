<svelte:options immutable={true} />

<script lang="ts">
  import SequenceForm from '../../../../components/sequencing/SequenceForm.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<SequenceForm
  initialSequenceCommandDictionaryId={data.initialSequence.authoring_command_dict_id}
  initialSequenceCreatedAt={data.initialSequence.created_at}
  initialSequenceDefinition={data.initialSequence.definition}
  initialSequenceName={data.initialSequence.name}
  initialSequenceId={data.initialSequence.id}
  initialSequenceUpdatedAt={data.initialSequence.updated_at}
  mode="edit"
/>
