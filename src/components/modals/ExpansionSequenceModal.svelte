<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { SEQUENCE_EXPANSION_MODE } from '../../constants/command-expansion';
  import { SequencingMode } from '../../enums/sequencing';
  import { expandedTemplates } from '../../stores/sequence-template';
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

  let outputStr: string | null = null;
  let language: string = 'plaintext';

  $: if (SEQUENCE_EXPANSION_MODE === SequencingMode.TEMPLATING) {
    const expandedTemplate = $expandedTemplates.find(
      expandedTemplate => expandedTemplate.seq_id === expansionSequence.seq_id,
    );
    outputStr = expandedTemplate?.expanded_template ?? `No output found for sequence "${expansionSequence.seq_id}"'`;
  } else {
    effects
      .getExpansionSequenceSeqJson(expansionSequence.seq_id, expansionSequence.simulation_dataset_id, user)
      .then((result: string | null) => (outputStr = result));
    language = 'json';
  }
</script>

<Modal height={400} width={600}>
  <ModalHeader on:close>Sequence ID: {expansionSequence.seq_id}</ModalHeader>
  <ModalContent>
    <div style:height="300px">
      <MonacoEditor
        automaticLayout={true}
        {language}
        lineNumbers="on"
        minimap={{ enabled: false }}
        readOnly={true}
        scrollBeyondLastLine={false}
        tabSize={2}
        value={outputStr}
      />
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button" on:click={() => dispatch('close')}> Close </button>
  </ModalFooter>
</Modal>
