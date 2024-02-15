<script lang="ts">
  import HorizontalDragIcon from '@nasa-jpl/stellar/icons/horizontal_drag.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { PlanStatusMessages } from '../../enums/planStatusMessages';
  import { permissionHandler } from '../../utilities/permissionHandler';
  import { TimelineLockStatus } from '../../utilities/timeline';
  import { tooltip } from '../../utilities/tooltip';

  export let hasUpdatePermission: boolean = false;
  export let timelineLockStatus: TimelineLockStatus = TimelineLockStatus.Locked;
  export let planReadOnly: boolean = false;

  const dispatch = createEventDispatcher();

  $: lockTooltipContent = `${
    timelineLockStatus === TimelineLockStatus.Locked ? 'Enable' : 'Disable'
  } activity drag and drop`;
  $: lockClassName = timelineLockStatus === TimelineLockStatus.Unlocked ? 'active' : '';

  $: if (!hasUpdatePermission) {
    dispatch('lock', TimelineLockStatus.Locked);
  }
</script>

<button
  class={`st-button icon toggle-button ${lockClassName}`}
  on:click
  use:tooltip={{ content: lockTooltipContent, disabled: !hasUpdatePermission, placement: 'bottom' }}
  use:permissionHandler={{
    hasPermission: hasUpdatePermission,
    permissionError: planReadOnly ? PlanStatusMessages.READ_ONLY : 'You do not have permission to update this timeline',
  }}
>
  <HorizontalDragIcon />
</button>
