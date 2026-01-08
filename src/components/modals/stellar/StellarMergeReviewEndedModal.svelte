<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { createEventDispatcher } from 'svelte';
  import type { PlanMergeRequestStatus } from '../../../types/plan';
  import StellarDialog from './StellarDialog.svelte';

  export let open: boolean = true;
  export let planId: number = -1;
  export let status: PlanMergeRequestStatus = 'pending';

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  $: statusVerb = status === 'pending' ? 'canceled' : status;

  function gotoPlan() {
    goto(`${base}/plans/${planId}`);
    open = false;
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

<StellarDialog
  bind:open
  size="sm"
  title="Merge Review Ended"
  showCloseButton={false}
  closeOnEscape={false}
  closeOnOutsideClick={false}
  on:close
>
  <div class="py-2">
    <div>This merge request has been {statusVerb}.</div>
  </div>
  <svelte:fragment slot="footer">
    <button class="st-button" on:click={gotoPlan}>Back to plan</button>
  </svelte:fragment>
</StellarDialog>
