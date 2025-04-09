<svelte:options immutable={true} />

<script lang="ts">
  import PlayBtnIcon from 'bootstrap-icons/icons/play-btn.svg?component';
  import StopwatchIcon from 'bootstrap-icons/icons/stopwatch.svg?component';
  import { Status } from '../../../enums/status';
  import type { ActionDefinition, ActionRun, ActionRunSlim } from '../../../types/actions';
  import { formatMS } from '../../../utilities/time';
  import StatusBadge from '../../ui/StatusBadge.svelte';

  export let actionRun: ActionRunSlim;
  export let actionDefinition: ActionDefinition | null;
  export let interactable: boolean = true;

  function getStatusForActionRun(actionStatus: ActionRun['status']): Status {
    if (actionRun.error?.message || actionRun.results?.status === 'FAILED') {
      return Status.Failed;
    }

    switch (actionStatus) {
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

<button
  class="action-run st-typography-medium st-button tertiary w-100"
  class:non-interactable={!interactable}
  on:click
>
  <div class="action-run-cell">
    <StatusBadge status={getStatusForActionRun(actionRun.status)} />
    {actionDefinition?.name ?? 'Loading...'}
  </div>
  <div>@{actionRun.requested_by}</div>
  <div class="action-run-cell">
    <PlayBtnIcon />{new Date(actionRun.requested_at).toLocaleString()}
  </div>
  <div class="action-run-cell">
    <StopwatchIcon />{formatMS(actionRun.duration)}
  </div>
</button>

<style>
  button.action-run {
    align-items: center;
    border: 1px solid var(--st-gray-20);
    border-radius: 4px;
    column-gap: 8px;
    display: grid;
    gap: 24px;
    grid-template-columns: 1fr 0.2fr 160px 80px;
    height: unset;
    padding: 8px;
    text-align: left;
    white-space: nowrap;
    width: 100%;
  }

  .non-interactable {
    cursor: default;
  }

  button.action-run.non-interactable:hover {
    background: unset;
  }

  .action-run-cell {
    align-items: center;
    display: flex;
    gap: 8px;
  }
</style>
