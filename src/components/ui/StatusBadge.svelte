<script lang="ts">
  import CheckIcon from '@nasa-jpl/stellar/icons/check.svg?component';
  import EditingIcon from '@nasa-jpl/stellar/icons/editing.svg?component';
  import MinusIcon from '@nasa-jpl/stellar/icons/minus.svg?component';
  import SpinnerIcon from '@nasa-jpl/stellar/icons/spinner.svg?component';
  import ThreeDotsIcon from '@nasa-jpl/stellar/icons/three_dot_horizontal.svg?component';
  import WarningIcon from '@nasa-jpl/stellar/icons/warning.svg?component';
  import { getColorForStatus, Status, statusColors } from '../../utilities/status';
  import { tooltip } from '../../utilities/tooltip';

  export let status: Status | null = null;
  export let showTooltip: boolean = true;

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
    {:else if status === Status.Incomplete}
      <SpinnerIcon />
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
</style>
