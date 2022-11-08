<svelte:options immutable={true} />

<script lang="ts">
  import PlanWithDownArrowIcon from '@nasa-jpl/stellar/icons/plan_with_down_arrow.svg?component';
  import PlanWithUpArrowIcon from '@nasa-jpl/stellar/icons/plan_with_up_arrow.svg?component';
  import { planMergeRequestsIncoming, planMergeRequestsOutgoing } from '../../stores/plan';
  import { showPlanMergeRequestsModal } from '../../utilities/modal';
  import { tooltip } from '../../utilities/tooltip';

  $: incomingPendingMergeRequets = $planMergeRequestsIncoming.filter(request => request.status === 'pending');
  $: outgoingPendingMergeRequets = $planMergeRequestsOutgoing.filter(request => request.status === 'pending');
  $: incomingPendingMergeRequetCount = incomingPendingMergeRequets.length;
  $: outgoingPendingMergeRequetCount = outgoingPendingMergeRequets.length;
</script>

{#if incomingPendingMergeRequetCount > 0 || outgoingPendingMergeRequetCount > 0}
  <button
    class="plan-merge-requests-status-button st-button tertiary st-typography-medium"
    on:click|stopPropagation={() => showPlanMergeRequestsModal()}
    use:tooltip={{
      content: `${incomingPendingMergeRequetCount} incoming, ${outgoingPendingMergeRequetCount} outgoing`,
      placement: 'top',
    }}
  >
    <span class="status-icon" class:active={incomingPendingMergeRequetCount > 0}>
      <PlanWithDownArrowIcon />
    </span>
    <span class="status-icon" class:active={outgoingPendingMergeRequetCount > 0}>
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
