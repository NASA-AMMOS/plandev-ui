<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { createEventDispatcher } from 'svelte';
  import type { PlanMergeRequestStatus } from '../../types/plan';
  import Modal from './Modal.svelte';
  import ModalContent from './ModalContent.svelte';
  import ModalFooter from './ModalFooter.svelte';
  import ModalHeader from './ModalHeader.svelte';

  export let planId: number = -1;
  export let status: PlanMergeRequestStatus = 'pending';

  const dispatch = createEventDispatcher();

  $: statusVerb = status === 'pending' ? 'canceled' : status;

  function gotoPlan() {
    goto(`${base}/plans/${planId}`);
    dispatch('close');
  }

  function onKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
      gotoPlan();
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<Modal height={150} width={380}>
  <ModalHeader showClose={false}>Merge Review Ended</ModalHeader>
  <ModalContent>
    <div>This merge request has been {statusVerb}.</div>
  </ModalContent>
  <ModalFooter>
    <button class="st-button" on:click={gotoPlan}>Back to plan</button>
  </ModalFooter>
</Modal>
