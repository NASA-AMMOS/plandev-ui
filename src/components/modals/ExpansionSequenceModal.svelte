<svelte:options immutable={true} />

<script lang="ts">
  import { Download } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { expandedTemplates } from '../../stores/sequence-template';
  import type { ExpansionSequence } from '../../types/expansion';
  import { downloadBlob } from '../../utilities/generic';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';
  import { getExpandedTemplateForSequence } from '../../utilities/expansion';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  export let expansionSequence: ExpansionSequence;

  let outputStr: string | null = null;
  let language: string = 'plaintext';

  $: {
    const expandedTemplate = getExpandedTemplateForSequence($expandedTemplates, expansionSequence);
    outputStr = expandedTemplate?.expanded_template ?? `No output found for sequence "${expansionSequence.seq_id}"'`;
  }

  function onDownload() {
    downloadBlob(
      new Blob([outputStr ?? `No output found for sequence "${expansionSequence.seq_id}"'`], { type: 'text/plain' }),
      `${expansionSequence.seq_id}_${expansionSequence.simulation_dataset_id}.txt`,
    );
  }
</script>

<Modal height={400} width={600} on:close>
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
    <button class="st-button secondary download-btn" on:click={onDownload}><Download size={16} /> Download</button>
    <button class="st-button" on:click={() => dispatch('close')}> Close </button>
  </ModalFooter>
</Modal>

<style>
  .download-btn {
    gap: 4px;
  }
</style>
