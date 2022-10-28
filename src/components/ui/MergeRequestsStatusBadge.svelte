<script lang="ts">
  import PlanWithDownArrowIcon from '@nasa-jpl/stellar/icons/plan_with_down_arrow.svg?component';
  import PlanWithUpArrowIcon from '@nasa-jpl/stellar/icons/plan_with_up_arrow.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { tooltip } from '../../utilities/tooltip';

  export let incomingMergeRequestCount: number = 0;
  export let outgoingMergeRequestCount: number = 0;

  const dispatch = createEventDispatcher();
</script>

<button
  class="merge-requests-status-badge st-button tertiary st-typography-medium"
  on:click={() => dispatch('click')}
  use:tooltip={{
    content: `${incomingMergeRequestCount} incoming, ${outgoingMergeRequestCount} outgoing`,
    placement: 'top',
  }}
>
  <span class="status-icon" class:active={incomingMergeRequestCount > 0}>
    <PlanWithDownArrowIcon />
  </span>
  <span class="status-icon" class:active={outgoingMergeRequestCount > 0}>
    <PlanWithUpArrowIcon />
  </span>
  <span>Merge requests</span>
</button>

<style>
  .merge-requests-status-badge {
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
  }

  .merge-requests-status-badge.st-button.tertiary:hover:not([disabled]) {
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
