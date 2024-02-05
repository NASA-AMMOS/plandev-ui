<script lang="ts">
  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import EditingIcon from '@nasa-jpl/stellar/icons/editing.svg?component';
  import IncompleteIcon from '@nasa-jpl/stellar/icons/incomplete.svg?component';
  import MinusIcon from '@nasa-jpl/stellar/icons/minus.svg?component';
  import ThreeDotsIcon from '@nasa-jpl/stellar/icons/three_dot_horizontal.svg?component';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import HourglassIcon from 'bootstrap-icons/icons/hourglass-top.svg?component';
  import { Status } from '../../enums/status';
  import { getColorForStatus, statusColors } from '../../utilities/status';
  import { tooltip } from '../../utilities/tooltip';
  import ProgressRadial from './ProgressRadial.svelte';

  export let badgeText: string | undefined = undefined;
  export let indeterminate: boolean = false;
  export let status: Status | null = null;
  export let showTooltip: boolean = true;
  export let prefix: string = '';
  export let progress: number = 0;

  let color: string = statusColors.gray;

  $: color = getColorForStatus(status);
  $: fgColor = status === Status.Modified || status === Status.Unchecked ? '#110d3e' : 'unset';
</script>

{#if status !== null}
  <span
    aria-label={status}
    class="status-badge {status.toLowerCase()}"
    style="background: {status === Status.Failed || status === Status.Unchecked ? 'transparent' : color}"
    use:tooltip={{ content: showTooltip ? `${prefix}${status}` : '', placement: 'top' }}
  >
    {#if badgeText === undefined}
      {#if status === Status.Complete}
        <CheckIcon />
      {:else if status === Status.Failed}
        <WarningIcon style="color: {color}" />
      {:else if status === Status.Canceled}
        <CloseIcon />
      {:else if status === Status.Incomplete}
        {#if indeterminate}
          <span class="status-badge--incomplete-indeterminate">
            <HourglassIcon />
          </span>
        {:else}
          <ProgressRadial {progress} />
        {/if}
      {:else if status === Status.Modified}
        <EditingIcon style="color: {fgColor};" />
      {:else if status === Status.Unchecked}
        <IncompleteIcon style="color: {color}" />
      {:else if status === Status.Pending}
        <ThreeDotsIcon />
      {:else if status === Status.PartialSuccess}
        <MinusIcon />
      {/if}
    {:else}
      <div class="status-badge-text" style="background-color: {color}; color: {fgColor};">
        {badgeText}
      </div>
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

  .status-badge-text {
    border-radius: 8px;
    font-size: 12px;
    padding: 0.5px 5px;
  }

  .status-badge--incomplete-indeterminate :global(svg.st-icon) {
    display: flex;
    height: 11px;
    width: 11px;
  }
</style>
