<svelte:options immutable={true} />

<script lang="ts">
  import PlayBtnIcon from 'bootstrap-icons/icons/play-btn.svg?component';
  import StopwatchIcon from 'bootstrap-icons/icons/stopwatch.svg?component';
  import BanIcon from 'bootstrap-icons/icons/ban.svg?component';
  import { Status } from '../../../enums/status';
  import type { ActionDefinition, ActionRunSlim } from '../../../types/actions';
  import { formatMS } from '../../../utilities/time';
  import StatusBadge from '../../ui/StatusBadge.svelte';
  import { tooltip } from '../../../utilities/tooltip';
  import { createEventDispatcher } from 'svelte';

  export let actionRun: ActionRunSlim;
  export let actionDefinition: ActionDefinition | null;
  export let interactable: boolean = true;

  const dispatch = createEventDispatcher<{
    cancelAction: { id: number };
    showActionRun: { id: number };
  }>();

  function getStatusForActionRun(actionRun: ActionRunSlim): Status {
    if (actionRun.canceled === true) {
      return Status.Canceled;
    }

    if (actionRun.error?.message || actionRun.results?.status === 'FAILED') {
      return Status.Failed;
    }

    switch (actionRun.status) {
      case 'success':
        return Status.Complete;
      case 'pending':
        return Status.Pending;
      case 'incomplete':
        return Status.Incomplete;
      case 'failed':
        return Status.Failed;
      default:
        return Status.Unchecked;
    }
  }
</script>

<div class="action-run-wrapper w-100 relative">
  <div
    class="action-run st-typography-medium st-button tertiary w-100"
    class:non-interactable={!interactable}
    role="button"
    tabindex="-1"
    on:keydown
    on:click|stopPropagation={() => dispatch('showActionRun', { id: actionRun.id })}
  >
    <div class="action-run-cell">
      <StatusBadge status={getStatusForActionRun(actionRun)} />
      {actionDefinition?.name ?? 'Loading...'}
    </div>
    <div>@{actionRun.requested_by}</div>
    <div class="action-run-cell">
      <PlayBtnIcon />{new Date(actionRun.requested_at).toLocaleString()}
    </div>
    <div class="action-run-cell">
      <StopwatchIcon />{formatMS(actionRun.duration)}
    </div>

    {#if actionRun.status === 'pending' || actionRun.status === 'incomplete'}
      <button
        type="button"
        class="cancel-button st-button st-icon tertiary icon"
        on:click|stopPropagation={() => dispatch('cancelAction', { id: actionRun.id })}
        use:tooltip={{ content: 'Cancel Action Run', placement: 'top' }}
      >
        <BanIcon />
      </button>
    {/if}
  </div>
</div>

<style>
  .action-run {
    align-items: center;
    border: 1px solid var(--st-gray-20);
    border-radius: 4px;
    column-gap: 8px;
    display: grid;
    gap: 24px;
    grid-template-columns: 1fr 0.2fr 160px 80px 25px;
    height: auto;
    padding: 8px;
    text-align: left;
    white-space: nowrap;
    width: 100%;
  }

  .non-interactable {
    cursor: default;
  }

  .action-run.non-interactable:hover {
    background: unset;
  }

  .action-run-cell {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .action-run-wrapper {
    position: relative;
  }

  .cancel-button {
    cursor: pointer;
    display: flex;
    height: 16px;
    justify-self: center;
  }
</style>
