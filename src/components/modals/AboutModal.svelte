<svelte:options accessors={true} immutable={true} />

<script lang="ts">
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';
  import { version } from '../../stores/app';

  export let modal: Modal;
</script>

<Modal bind:this={modal} height={200}>
  <ModalHeader on:close={modal.hide}>About</ModalHeader>
  <ModalContent>
    <div>Copyright 2021, by the California Institute of Technology.</div>
    <div>ALL RIGHTS RESERVED.</div>
    <div>
      United States Government sponsorship acknowledged. Any commercial use must be negotiated with the Office of
      Technology Transfer at the California Institute of Technology.
    </div>
    <div class="mt-3">
      {$version.name} -
      <a href={$version.commitUrl} rel="noopener noreferrer" target="_blank">
        {$version.branch}:{$version.commit}
      </a>
      -
      {$version.date}
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button" on:click|stopPropagation={modal.hide}> Close </button>
  </ModalFooter>
</Modal>
