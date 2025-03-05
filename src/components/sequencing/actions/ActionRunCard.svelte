<svelte:options immutable={true} />

<script lang="ts">
  import PlayBtnIcon from 'bootstrap-icons/icons/play-btn.svg?component';
  import StopwatchIcon from 'bootstrap-icons/icons/stopwatch.svg?component';
  import { Status } from '../../../enums/status';
  import type { ActionDefinition, ActionRun } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import StatusBadge from '../../ui/StatusBadge.svelte';

  export let actionRun: ActionRun;
  export let actionDefinition: ActionDefinition | null;
  export let interactable: boolean = true;
  export let user: User | null;

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
</script>

<button class="action-run st-typography-medium st-button tertiary w1-" class:non-interactable={!interactable} on:click>
  <div style=" align-items: center;display: flex; gap: 8px">
    <StatusBadge status={getStatusForActionRun(actionRun.status)} />
    {actionDefinition?.name}
  </div>
  <div>{actionDefinition?.description || 'No description'}</div>
  <div>ID: {actionRun.id}</div>
  <div>@{actionRun.created_by}</div>
  <div style=" align-items: center;display: flex; gap: 8px">
    <PlayBtnIcon />{actionRun.created_at}
  </div>
  <div style=" align-items: center;display: flex; gap: 8px">
    <StopwatchIcon />24:26
  </div>
  <!-- <div>Action Run Response: {JSON.stringify(actionRun.response)}</div> -->
</button>

<style>
  button.action-run {
    align-items: center;
    border: 1px solid var(--st-gray-20);
    border-radius: 4px;
    column-gap: 8px;
    display: grid;
    grid-template-columns: 2.5fr 2fr 1fr 1fr 2fr 1fr;
    height: unset;
    padding: 8px;
    white-space: nowrap;
    width: 100%;
  }

  .non-interactable {
    cursor: default;
  }

  button.action-run.non-interactable:hover {
    background: unset;
  }
</style>
