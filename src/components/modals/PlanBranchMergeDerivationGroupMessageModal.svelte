<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let height: number = 150;
  export let width: number = 380;
  export let sourcePlanName: string;
  export let targetPlanName: string;

  const dispatch = createEventDispatcher<{
    close: void;
    confirm: void;
  }>();

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      dispatch('confirm');
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal {height} {width}>
  <ModalHeader on:close>Derivation Group Behavior</ModalHeader>
  <ModalContent>
    <p>
      The derivation groups unique to <i>{sourcePlanName}</i> will now be associated with <i>{targetPlanName}</i>. This
      operation does not affect <i>{sourcePlanName}</i> itself.
    </p>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={() => dispatch('close')}> Cancel </button>
    <button class="st-button" on:click={() => dispatch('confirm')}> Confirm </button>
  </ModalFooter>
</Modal>
