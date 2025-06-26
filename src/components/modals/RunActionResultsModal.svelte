<svelte:options immutable={true} />

<script lang="ts">
  import Modal from './Modal.svelte';
  import ModalHeader from './ModalHeader.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import { createEventDispatcher } from 'svelte';

  export let actionRunId: number;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: number;
  }>();

  function close() {
    dispatch(`close`);
  }

  function openActionRunResults() {
    dispatch(`confirm`, actionRunId);
  }
</script>

<Modal height="max-content" width={300}>
  <ModalHeader on:close>Action Run Started</ModalHeader>
  <ModalContent style="max-height: 50vh;overflow: auto">
    <div class="st-typography-label pb-2">
      Your Action run has started. View results now or Close to return to Sequence Editor.
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={close}>Close</button>
    <button class="st-button" on:click|stopPropagation={openActionRunResults}>View Results</button>
  </ModalFooter>
</Modal>
