<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import MonacoEditor from '../ui/MonacoEditor.svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  export let content: object;
  export let readOnly: boolean;
  export let language: string;
  export let modalTitle: string;
</script>

<Modal height={400} width={600}>
  <ModalHeader on:close>{modalTitle}</ModalHeader>
  <ModalContent>
    <div style:height="300px">
      <MonacoEditor
        automaticLayout={true}
        {language}
        lineNumbers="on"
        minimap={{ enabled: false }}
        {readOnly}
        scrollBeyondLastLine={false}
        tabSize={2}
        value={JSON.stringify(content, undefined, 2)}
      />
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button" on:click={() => dispatch('close')}> Close </button>
  </ModalFooter>
</Modal>
