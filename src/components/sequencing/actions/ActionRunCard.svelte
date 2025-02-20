<svelte:options immutable={true} />

<script lang="ts">
  import PlayBtnIcon from 'bootstrap-icons/icons/play-btn.svg?component';
  import StopwatchIcon from 'bootstrap-icons/icons/stopwatch.svg?component';
  import { Status } from '../../../enums/status';
  import { actionsMap } from '../../../stores/actions';
  import type { Action, ActionRun } from '../../../types/actions';
  import type { User } from '../../../types/app';
  import StatusBadge from '../../ui/StatusBadge.svelte';

  export let actionRun: ActionRun;
  export let interactable: boolean = true;
  export let user: User | null;

  let action: Action | undefined = undefined;

  $: if (actionRun) {
    action = $actionsMap[actionRun.actionId];
    console.log('actionRun :>> ', actionRun, $actionsMap);
  }

  $: status = actionRun.response.errors
    ? Status.Failed
    : actionRun.response.results.status === 'FAILED'
      ? Status.Failed
      : Status.Complete;
</script>

<button class="action-run st-typography-medium st-button tertiary w1-" class:non-interactable={!interactable} on:click>
  <div style="display: flex; gap: 8px; align-items: center">
    <StatusBadge {status} />
    {action?.name}
  </div>
  <div>{action?.description || 'No description'}</div>
  <div>ID: {actionRun.id}</div>
  <div>@{actionRun.user}</div>
  <div style="display: flex; gap: 8px; align-items: center">
    <PlayBtnIcon />12:31:05 Feb 19, 2025
  </div>
  <div style="display: flex; gap: 8px; align-items: center">
    <StopwatchIcon />24:26
  </div>
  <!-- <div>Action Run Response: {JSON.stringify(actionRun.response)}</div> -->
</button>

<style>
  .action-run {
    border: 1px solid var(--st-gray-20);
    padding: 8px;
    border-radius: 4px;
    column-gap: 8px;
    display: grid;
    grid-template-columns: 2.5fr 2fr 1fr 1fr 2fr 1fr;
    width: 100%;
    white-space: nowrap;
    align-items: center;
    height: unset;
  }

  .non-interactable {
    cursor: default;
  }

  button.action-run.non-interactable:hover {
    background: unset;
  }
</style>
