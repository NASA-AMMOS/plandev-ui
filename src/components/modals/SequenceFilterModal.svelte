<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';
  import type { SequenceFilter } from '../../types/sequencing';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  export let sequenceFilter: SequenceFilter;
</script>

<Modal height={400} width={600}>
  <ModalHeader on:close>Sequence Filter ID: {sequenceFilter.id}</ModalHeader>
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
        value={JSON.stringify(sequenceFilter.filter, undefined, 2)}
      />
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button" on:click={() => dispatch('close')}> Close </button>
  </ModalFooter>
</Modal>
