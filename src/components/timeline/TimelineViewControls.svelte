<script lang="ts">
  import ArrowLeftIcon from '@nasa-jpl/stellar/icons/arrow_left.svg?component';
  import ArrowRightIcon from '@nasa-jpl/stellar/icons/arrow_right.svg?component';
  import MinusIcon from '@nasa-jpl/stellar/icons/minus.svg?component';
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import RotateCounterClockwiseIcon from '@nasa-jpl/stellar/icons/rotate_counter_clockwise.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { tooltip } from '../../utilities/tooltip';

  export let maxTimeRange: TimeRange = { end: 0, start: 0 };
  export let minZoomMS = 100; // Min zoom of one minute
  export let nudgePercent = 0.05;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };

  const dispatch = createEventDispatcher();

  $: maxDuration = maxTimeRange.end - maxTimeRange.start;
  $: viewDuration = viewTimeRange.end - viewTimeRange.start;
  $: viewTimeRangePercentZoom = (viewTimeRange.end - viewTimeRange.start) / (maxTimeRange.end - maxTimeRange.start);

  // TODO implement a more sophisticated zooming step that based off time instead of percentage for the high zoom
  // cases or even the whole range
  $: zoomActionPercent = viewTimeRangePercentZoom < 0.1 ? 0.005 : 0.05;

  function onKeydown(e: KeyboardEvent & { currentTarget: EventTarget & Window; target: HTMLElement }) {
    // If user holds shift while not focused on an input then activate the temporary unlock.
    // If an input is focused, we assume they're holding shift to capitalize instead.
    if (e.target.tagName !== 'INPUT') {
      if (e.key === '=') {
        onZoomIn();
      } else if (e.key === '-') {
        onZoomOut();
      } else if (e.key === '[') {
        onNudgeLeft();
      } else if (e.key === ']') {
        onNudgeRight();
      } else if (e.key === '0') {
        onResetViewTimeRange();
      }
    }
  }

  function onZoomIn() {
    // Compute current zoom percentage
    const newDuration = Math.max((viewTimeRangePercentZoom - zoomActionPercent) * maxDuration, minZoomMS);
    const pivotTime = viewTimeRange.start + viewDuration / 2;
    const newStart = pivotTime - newDuration / 2;
    const newEnd = pivotTime + newDuration / 2;
    dispatch('viewTimeRangeChanged', { end: newEnd, start: newStart });
  }

  function onZoomOut() {
    // Compute current zoom percentage
    let newDuration = (viewTimeRangePercentZoom + zoomActionPercent) * maxDuration;

    // Clamp zoom
    if (viewDuration >= maxDuration) {
      newDuration = maxDuration;
      dispatch('viewTimeRangeChanged', maxTimeRange);
      return;
    }

    const pivotTime = viewTimeRange.start + viewDuration / 2;
    const newStart = Math.max(pivotTime - newDuration / 2, maxTimeRange.start);
    const newEnd = Math.min(pivotTime + newDuration / 2, maxTimeRange.end);

    dispatch('viewTimeRangeChanged', { end: newEnd, start: newStart });
  }

  function onNudgeLeft() {
    // Nudge the time window to the left 5%
    const newStart = Math.max(viewTimeRange.start - viewDuration * nudgePercent, maxTimeRange.start);
    let newEnd = Math.min(viewTimeRange.end - viewDuration * nudgePercent, maxTimeRange.end);
    if (newStart === maxTimeRange.start) {
      newEnd = viewTimeRange.start + viewDuration;
    }
    dispatch('viewTimeRangeChanged', { end: newEnd, start: newStart });
  }

  function onNudgeRight() {
    // Shift the time window to the right
    const newEnd = Math.min(viewTimeRange.end + viewDuration * nudgePercent, maxTimeRange.end);
    let newStart = Math.max(viewTimeRange.start + viewDuration * nudgePercent, maxTimeRange.start);
    if (newEnd === maxTimeRange.end) {
      newStart = viewTimeRange.end - viewDuration;
    }
    dispatch('viewTimeRangeChanged', { end: newEnd, start: newStart });
  }

  function onResetViewTimeRange() {
    dispatch('viewTimeRangeChanged', maxTimeRange);
  }
</script>

<svelte:window on:keydown={onKeydown} />

<button
  class="st-button icon"
  on:click={onNudgeLeft}
  use:tooltip={{ content: `Shift Left '['`, placement: 'bottom' }}
  disabled={viewTimeRange.start === maxTimeRange.start}
>
  <ArrowLeftIcon />
</button>
<button
  class="st-button icon"
  on:click={onNudgeRight}
  use:tooltip={{ content: `Shift Right ']'`, placement: 'bottom' }}
  disabled={viewTimeRange.end === maxTimeRange.end}
>
  <ArrowRightIcon />
</button>
<button
  class="st-button icon"
  on:click={onZoomOut}
  use:tooltip={{ content: `Zoom Out '-'`, placement: 'bottom' }}
  disabled={viewDuration === maxDuration}
>
  <MinusIcon />
</button>
<button
  class="st-button icon"
  on:click={onZoomIn}
  use:tooltip={{ content: `Zoom In '='`, placement: 'bottom' }}
  disabled={viewDuration === minZoomMS}
>
  <PlusIcon />
</button>
<button
  class="st-button icon"
  on:click={onResetViewTimeRange}
  use:tooltip={{ content: `Reset Visible Time Range '0'`, placement: 'bottom' }}
  disabled={viewDuration === maxDuration}
>
  <RotateCounterClockwiseIcon />
</button>

<style>
  .st-button {
    border: 1px solid var(--st-gray-30);
    color: var(--st-gray-70);
  }
</style>
