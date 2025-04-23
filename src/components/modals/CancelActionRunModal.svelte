<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 175;
  export let width: number = 300;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: boolean;
  }>();

  function onConfirm() {
    dispatch('confirm', true);
  }
</script>

<Modal {height} {width}>
  <ModalHeader on:close>Cancel Action Run</ModalHeader>
  <ModalContent>
    <div class="st-typography-body">Are you sure you want to cancel this Action run?</div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Nevermind </button>
    <button class="st-button" on:click={onConfirm}> Cancel Action Run </button>
  </ModalFooter>
</Modal>
