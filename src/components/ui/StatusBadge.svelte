<script lang="ts">
  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import EditingIcon from '@nasa-jpl/stellar/icons/editing.svg?component';
  import MinusIcon from '@nasa-jpl/stellar/icons/minus.svg?component';
  import ThreeDotsIcon from '@nasa-jpl/stellar/icons/three_dot_horizontal.svg?component';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import { getColorForStatus, Status, statusColors } from '../../utilities/status';
  import { tooltip } from '../../utilities/tooltip';
  import ProgressRadial from './ProgressRadial.svelte';

  export let status: Status | null = null;
  export let showTooltip: boolean = true;
  export let progress: number = 0;

  let color: string = statusColors.gray;

  $: color = getColorForStatus(status);
</script>

{#if status !== null}
  <span
    aria-label={status}
    class="status-badge {status.toLowerCase()}"
    style="background: {status === Status.Failed ? 'transparent' : color}"
    use:tooltip={{ content: showTooltip ? status : '', placement: 'bottom' }}
  >
    {#if status === Status.Complete}
      <CheckIcon />
    {:else if status === Status.Failed}
      <WarningIcon style="color: {color}" />
    {:else if status === Status.Canceled}
      <CloseIcon />
    {:else if status === Status.Incomplete}
      <ProgressRadial {progress} />
    {:else if status === Status.Modified}
      <EditingIcon />
    {:else if status === Status.Pending}
      <ThreeDotsIcon />
    {:else if status === Status.PartialSuccess}
      <MinusIcon />
    {/if}
  </span>
{/if}

<style>
  .status-badge {
    align-items: center;
    border-radius: 9999px;
    color: #fff;
    display: inline-flex;
    height: 16px;
    justify-content: center;
    width: 16px;
  }

  .radial-progress {
    clip: rect(0px, 20px, 20px, 10px); /* Hide half of the progress bar */
    height: 20px;
    position: absolute; /* Enable clipping */
    width: 20px; /* Set the size of the progress bar */
  }
  .radial-progress-circle {
    border: 10px solid green;
    border-radius: 10px;
    clip: rect(0px, 10px, 20px, 0px);
    height: 10px;
    position: absolute;
    width: 10px;
  }
</style>
