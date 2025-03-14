<svelte:options immutable={true} />

<script lang="ts">
  import PlayBtnIcon from 'bootstrap-icons/icons/play-btn.svg?component';
  import StopwatchIcon from 'bootstrap-icons/icons/stopwatch.svg?component';
  import { Status } from '../../../enums/status';
  import type { ActionDefinition, ActionRun, ActionRunSlim } from '../../../types/actions';
  import { convertUsToDurationString } from '../../../utilities/time';
  import StatusBadge from '../../ui/StatusBadge.svelte';

  export let actionRun: ActionRunSlim;
  export let actionDefinition: ActionDefinition | null;
  export let interactable: boolean = true;

  function getStatusForActionRun(actionStatus: ActionRun['status']): Status {
    if (actionRun.error || actionRun.results?.status === 'FAILED') {
      return Status.Failed;
    }

    switch (actionStatus) {
      case 'complete':
        return Status.Complete;
      case 'pending':
        return Status.Pending;
      case 'in-progress':
        return Status.Incomplete;
      case 'failed':
        return Status.Failed;
      default:
        return Status.Unchecked;
    }
  }

  function formatDuration(duration: number | null): string {
    if (typeof duration === 'number') {
      return `${convertUsToDurationString(duration * 1000).split(' ')[0]}`;
    }
    return '–';
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
  <div>@{actionRun.created_by}</div>
  <div class="action-run-cell">
    <PlayBtnIcon />{new Date(actionRun.created_at).toLocaleString()}
  </div>
  <div class="action-run-cell">
    <StopwatchIcon />{formatDuration(actionRun.duration)}
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
