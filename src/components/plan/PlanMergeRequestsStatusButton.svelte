<svelte:options immutable={true} />

<script lang="ts">
  import PlanWithDownArrowIcon from '@nasa-jpl/stellar/icons/plan_with_down_arrow.svg?component';
  import PlanWithUpArrowIcon from '@nasa-jpl/stellar/icons/plan_with_up_arrow.svg?component';
  import { planMergeRequestsIncoming, planMergeRequestsOutgoing } from '../../stores/plan';
  import type { User } from '../../types/app';
  import { showPlanMergeRequestsModal } from '../../utilities/modal';
  import { tooltip } from '../../utilities/tooltip';

  export let user: User | null;

  $: incomingPendingMergeRequests = $planMergeRequestsIncoming.filter(request => request.status === 'pending');
  $: outgoingPendingMergeRequests = $planMergeRequestsOutgoing.filter(request => request.status === 'pending');
  $: incomingPendingMergeRequestCount = incomingPendingMergeRequests.length;
  $: outgoingPendingMergeRequestCount = outgoingPendingMergeRequests.length;
  $: label = `${incomingPendingMergeRequestCount} incoming, ${outgoingPendingMergeRequestCount} outgoing`;
</script>

{#if incomingPendingMergeRequestCount > 0 || outgoingPendingMergeRequestCount > 0}
  <button
    aria-label={label}
    class="plan-merge-requests-status-button st-button tertiary st-typography-medium"
    on:click|stopPropagation={() => showPlanMergeRequestsModal(user)}
    use:tooltip={{ content: label, placement: 'top' }}
  >
    <span class="status-icon" class:active={incomingPendingMergeRequestCount > 0}>
      <PlanWithDownArrowIcon />
    </span>
    <span class="status-icon" class:active={outgoingPendingMergeRequestCount > 0}>
      <PlanWithUpArrowIcon />
    </span>
    <span>Merge requests</span>
  </button>
{/if}

<style>
  .plan-merge-requests-status-button {
    align-items: center;
    background: rgba(255, 255, 255, 0.24);
    border-radius: 4px;
    color: var(--st-white);
    display: flex;
    flex-direction: row;
    font-size: 14px;
    gap: 8px;
    height: 24px;
    justify-content: center;
    letter-spacing: 0.025em;
    line-height: 16px;
    padding: 4px 8px;
    white-space: nowrap;
  }

  .plan-merge-requests-status-button.st-button.tertiary:hover:not([disabled]) {
    background: rgba(255, 255, 255, 0.2);
  }

  .status-icon {
    color: var(--st-white);
    display: flex;
    opacity: 0.4;
  }

  .status-icon.active {
    color: #ffcf25;
    opacity: 1;
  }
</style>
