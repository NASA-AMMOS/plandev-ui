<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let planId: number = -1;

  const dispatch = createEventDispatcher();

  function gotoReview() {
    goto(`${base}/plans/${planId}/merge`);
    dispatch('close');
  }

  function gotoPlans() {
    goto(`${base}/plans`);
    dispatch('close');
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      gotoReview();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal height={150} width={380}>
  <ModalHeader showClose={false}>Plan Locked</ModalHeader>
  <ModalContent>
    <div>
      The plan you are viewing is locked and under review. Once the review has ended this plan will become editable
      again.
    </div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button secondary" on:click={gotoPlans}>View all plans</button>
    <button class="st-button" on:click={gotoReview}>Take me to the review</button>
  </ModalFooter>
</Modal>
