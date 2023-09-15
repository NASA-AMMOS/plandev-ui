<script lang="ts">
  import LockIcon from '@nasa-jpl/stellar/icons/lock.svg?component';
  import UnlockIcon from '@nasa-jpl/stellar/icons/unlock.svg?component';
  import { createEventDispatcher, onMount } from 'svelte';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { TimelineLockStatus } from '../../utilities/timeline';
  import { tooltip } from '../../utilities/tooltip';

  export let hasUpdatePermission: boolean = false;
  export let timelineLockStatus: TimelineLockStatus = TimelineLockStatus.Locked;

  const dispatch = createEventDispatcher();
  const lockTooltipContent = 'Click to unlock timeline, or press and hold the Shift key to temporarily unlock';

  $: tooltipDisabled = timelineLockStatus !== TimelineLockStatus.Locked;
  $: lockClassName = timelineLockStatus === TimelineLockStatus.TemporaryUnlock ? 'temporary-unlock' : '';

  $: if (!hasUpdatePermission) {
    dispatch('lock', TimelineLockStatus.Locked);
  }

  onMount(() => {
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('keyup', onKeyup);

    return () => {
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('keyup', onKeyup);
    };
  });

  function onKeydown(e: KeyboardEvent) {
    // If user holds shift while not focused on an input then activate the temporary unlock.
    // If an input is focused, we assume they're holding shift to capitalize instead.
    if (
      e.key === 'Shift' &&
      (e.target as HTMLElement).tagName !== 'INPUT' &&
      timelineLockStatus !== TimelineLockStatus.Unlocked &&
      hasUpdatePermission
    ) {
      dispatch('temporaryUnlock', TimelineLockStatus.TemporaryUnlock);
    }
  }

  function onKeyup(e: KeyboardEvent) {
    if (e.key === 'Shift' && timelineLockStatus === TimelineLockStatus.TemporaryUnlock) {
      dispatch('lock', TimelineLockStatus.Locked);
    }
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
  use:tooltip={{ content: lockTooltipContent, disabled: tooltipDisabled || !hasUpdatePermission, placement: 'bottom' }}
  use:permissionHandler={{
    hasPermission: hasUpdatePermission,
    permissionError: 'You do not have permission to update this timeline',
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

  .temporary-unlock,
  .temporary-unlock:hover {
    background-color: var(--st-utility-blue);
    border-color: transparent;
    color: #ffffff;
  }
</style>
