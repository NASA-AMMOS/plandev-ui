<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { User } from '../../types/app';
  import type { ExpansionSequence } from '../../types/expansion';
  import effects from '../../utilities/effects';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  export let expansionSequence: ExpansionSequence;
  export let user: User | null;

  let seqJsonStr: string | null = null;

  $: effects
    .getExpansionSequenceSeqJson(expansionSequence.seq_id, expansionSequence.simulation_dataset_id, user)
    .then((result: string | null) => (seqJsonStr = result));
</script>

<Modal height={400} width={600}>
  <ModalHeader on:close>Sequence ID: {expansionSequence.seq_id}</ModalHeader>
  <ModalContent>
    <div style:height="300px">
      <MonacoEditor
        automaticLayout={true}
        language="json"
        lineNumbers="on"
        minimap={{ enabled: false }}
        readOnly={true}
        scrollBeyondLastLine={false}
        tabSize={2}
        value={seqJsonStr}
      />
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button" on:click={() => dispatch('close')}> Close </button>
  </ModalFooter>
</Modal>
