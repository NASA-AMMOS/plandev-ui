<script lang="ts">
  import CheckIcon from '@nasa-jpl/stellar/icons/svg/check.svg?component';
  import EditingIcon from '@nasa-jpl/stellar/icons/svg/editing.svg?component';
  import MinusIcon from '@nasa-jpl/stellar/icons/svg/minus.svg?component';
  import QuestionIcon from '@nasa-jpl/stellar/icons/svg/question.svg?component';
  import ThreeDotsIcon from '@nasa-jpl/stellar/icons/svg/three_dot_horizontal.svg?component';
  import WarningIcon from '@nasa-jpl/stellar/icons/svg/warning.svg?component';
  import { getColorForStatus, Status, statusColors } from '../../utilities/status';
  import { tooltip } from '../../utilities/tooltip';

  export let status: Status = Status.Clean;

  let color: string = statusColors.blue;

  $: color = getColorForStatus(status);
</script>

<span
  class="status-badge {status}"
  style="background: {status === Status.Failed ? 'transparent' : color}"
  use:tooltip={{ content: status, placement: 'bottom' }}
>
  {#if status === Status.Clean || status === Status.Complete}
    <CheckIcon />
  {:else if status === Status.Executing || status === Status.Pending}
    <ThreeDotsIcon />
  {:else if status === Status.Incomplete}
    <MinusIcon />
  {:else if status === Status.Dirty}
    <EditingIcon />
  {:else if status === Status.Failed}
    <WarningIcon style="color: {color}" />
  {:else}
    <QuestionIcon />
  {/if}
</span>

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
