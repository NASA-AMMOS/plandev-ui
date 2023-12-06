<script lang="ts">
  import LockIcon from '@nasa-jpl/stellar/icons/lock.svg?component';
  import UnlockIcon from '@nasa-jpl/stellar/icons/unlock.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { TimelineLockStatus } from '../../utilities/timeline';
  import { tooltip } from '../../utilities/tooltip';

  export let hasUpdatePermission: boolean = false;
  export let timelineLockStatus: TimelineLockStatus = TimelineLockStatus.Locked;
  export let planReadOnly: boolean = false;

  const dispatch = createEventDispatcher();

  $: lockTooltipContent = `${timelineLockStatus === TimelineLockStatus.Locked ? 'Unlock' : 'Lock'} the timeline`;
  $: lockClassName = timelineLockStatus === TimelineLockStatus.Unlocked ? 'unlocked' : '';

  $: if (!hasUpdatePermission) {
    dispatch('lock', TimelineLockStatus.Locked);
  }

  function onClick() {
    if (timelineLockStatus === TimelineLockStatus.Locked) {
      dispatch('unlock', TimelineLockStatus.Unlocked);
    } else {
      dispatch('lock', TimelineLockStatus.Locked);
    }
  }
</script>

<button
  class={`st-button icon ${lockClassName}`}
  on:click={onClick}
  use:tooltip={{ content: lockTooltipContent, disabled: !hasUpdatePermission, placement: 'bottom' }}
  use:permissionHandler={{
    hasPermission: hasUpdatePermission,
    permissionError: planReadOnly ? PlanStatusMessages.READ_ONLY : 'You do not have permission to update this timeline',
  }}
>
  {#if timelineLockStatus === TimelineLockStatus.Locked}
    <LockIcon />
  {:else}
    <UnlockIcon />
  {/if}
</button>

<style>
  .st-button {
    border: 1px solid var(--st-gray-30);
    color: var(--st-gray-70);
  }

  .unlocked,
  .unlocked:hover {
    background-color: var(--st-utility-blue) !important;
    border-color: transparent;
    color: #ffffff;
  }
</style>
