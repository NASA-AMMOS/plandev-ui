<script lang="ts">
  import ArrowLeftIcon from '@nasa-jpl/stellar/icons/arrow_left.svg?component';
  import ArrowRightIcon from '@nasa-jpl/stellar/icons/arrow_right.svg?component';
  import ArrowUpRightIcon from '@nasa-jpl/stellar/icons/arrow_up_right.svg?component';
  import AutoScrollIcon from '@nasa-jpl/stellar/icons/auto_scroll.svg?component';
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import DecimateIcon from '@nasa-jpl/stellar/icons/decimate.svg?component';
  import ShowTooltipIcon from '@nasa-jpl/stellar/icons/hide_tooltip.svg?component';
  import HorizontalDragIcon from '@nasa-jpl/stellar/icons/horizontal_drag.svg?component';
  import InterpolateIcon from '@nasa-jpl/stellar/icons/interpolate.svg?component';
  import LinkIcon from '@nasa-jpl/stellar/icons/link.svg?component';
  import MinusIcon from '@nasa-jpl/stellar/icons/minus.svg?component';
  import PlusIcon from '@nasa-jpl/stellar/icons/plus.svg?component';
  import RotateCounterClockwiseIcon from '@nasa-jpl/stellar/icons/rotate_counter_clockwise.svg?component';
  import TooltipLineIcon from '@nasa-jpl/stellar/icons/tooltip_line.svg?component';
  import ClipboardIcon from 'bootstrap-icons/icons/clipboard.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { SearchParameters } from '../../enums/searchParameters';
  import { activityDirectivesMap, selectedActivityDirective } from '../../stores/activities';
  import { plan, planReadOnly } from '../../stores/plan';
  import {
    selectedSpan,
    simulationDataset,
    simulationDatasetId,
    spanUtilityMaps,
    spansMap,
  } from '../../stores/simulation';
  import { timelineInteractionMode, timelineLockStatus, viewIsModified } from '../../stores/views';
  import type { TimeRange } from '../../types/timeline';
  import {
    getActivityDirectiveStartTimeMs,
    getDoyTimeFromInterval,
    getIntervalInMs,
    getUnixEpochTime,
  } from '../../utilities/time';
  import { TimelineLockStatus } from '../../utilities/timeline';
  import { showFailureToast, showSuccessToast } from '../../utilities/toast';
  import { tooltip } from '../../utilities/tooltip';
  import Input from '../form/Input.svelte';
  import Menu from '../menus/Menu.svelte';
  import TimelineInteractionModeControl from './TimelineInteractionModeControl.svelte';
  import TimelineLockControl from './TimelineLockControl.svelte';

  export let maxTimeRange: TimeRange = { end: 0, start: 0 };
  export let nudgePercent = 0.05;
  export let decimate = false;
  export let hasUpdateDirectivePermission = false;
  export let showTimelineTooltip = true;
  export let interpolateHoverValue = false;
  export let limitTooltipToLine = false;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };

  let followSelection: boolean = false;
  let pickerMenu: Menu;
  let viewURL: URL | null = null;

  const dispatch = createEventDispatcher<{
    toggleDecimation: boolean;
    toggleInterpolateHoverValue: boolean;
    toggleLimitTooltipToLine: boolean;
    toggleTimelineTooltip: boolean;
    viewTimeRangeChanged: TimeRange;
  }>();

  $: maxDuration = maxTimeRange.end - maxTimeRange.start;
  $: viewDuration = viewTimeRange.end - viewTimeRange.start;

  $: if (followSelection && ($selectedActivityDirective || $selectedSpan)) {
    scrollIfOffscreen();
  }

  $: if (
    typeof window !== 'undefined' &&
    ($selectedActivityDirective || $selectedSpan || $simulationDatasetId !== null)
  ) {
    viewURL = new URL(window.location.href);
    viewURL.searchParams.set(SearchParameters.START_TIME, new Date(viewTimeRange.start).toISOString());
    viewURL.searchParams.set(SearchParameters.END_TIME, new Date(viewTimeRange.end).toISOString());
    if ($selectedActivityDirective) {
      viewURL.searchParams.set(SearchParameters.ACTIVITY_ID, $selectedActivityDirective.id.toFixed());
    }
    if ($selectedSpan) {
      viewURL.searchParams.set(SearchParameters.SPAN_ID, $selectedSpan.id.toFixed());
    }
    if ($simulationDatasetId) {
      viewURL.searchParams.set(SearchParameters.SIMULATION_DATASET_ID, $simulationDatasetId.toFixed());
    }
  }

  function onKeydown(e: KeyboardEvent) {
    // If user holds shift while not focused on an input then activate the temporary unlock.
    // If an input is focused, we assume they're holding shift to capitalize instead.
    if ((e.target as HTMLElement)?.tagName !== 'INPUT') {
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
    const duration = viewTimeRange.end - viewTimeRange.start;
    const newDuration = duration * 0.66;
    const pivotTime = viewTimeRange.start + viewDuration / 2;
    const newStart = pivotTime - newDuration / 2;
    const newEnd = pivotTime + newDuration / 2;

    dispatch('viewTimeRangeChanged', { end: newEnd, start: newStart });
  }

  function onZoomOut() {
    // Compute current zoom percentage
    const duration = viewTimeRange.end - viewTimeRange.start;
    let newDuration = duration * (1 / 0.66);

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

  function onToggleDecimation() {
    dispatch('toggleDecimation', !decimate);
  }

  function onToggleTimelineTooltip() {
    dispatch('toggleTimelineTooltip', !showTimelineTooltip);
  }

  function onToggleInterpolate() {
    dispatch('toggleInterpolateHoverValue', !interpolateHoverValue);
  }

  function onLimitTooltipToLine() {
    dispatch('toggleLimitTooltipToLine', !limitTooltipToLine);
  }

  function getSelectionTime() {
    let time: number = NaN;
    if ($selectedActivityDirective && $plan) {
      time = getActivityDirectiveStartTimeMs(
        $selectedActivityDirective.id,
        $plan.start_time,
        $plan.end_time_doy,
        $activityDirectivesMap,
        $spansMap,
        $spanUtilityMaps,
      );
    } else if ($selectedSpan && $simulationDataset?.simulation_start_time) {
      time = getUnixEpochTime(
        getDoyTimeFromInterval($simulationDataset?.simulation_start_time, $selectedSpan.start_offset),
      );
    }
    return time;
  }

  function onToggleFollowSelection() {
    followSelection = !followSelection;
    if (followSelection) {
      scrollIfOffscreen();
    }
  }

  function scrollIfOffscreen() {
    const time = getSelectionTime();
    if (time < viewTimeRange.start || time > viewTimeRange.end) {
      scrollToSelection();
    }
  }

  function scrollToSelection() {
    const time = getSelectionTime();
    if (!isNaN(time) && (time < viewTimeRange.start || time > viewTimeRange.end)) {
      const midSpan = time + getIntervalInMs($selectedSpan?.duration) / 2;
      const start = Math.max(maxTimeRange.start, midSpan - viewDuration / 2);
      const end = Math.min(maxTimeRange.end, midSpan + viewDuration / 2);
      dispatch('viewTimeRangeChanged', {
        end,
        start,
      });
    }
  }

  function openDoc(event: MouseEvent, url: string) {
    event.preventDefault();
    event.stopPropagation();
    window.open(url, '_newtab');
  }

  async function copyViewToClipboard() {
    if (viewURL) {
      try {
        await navigator.clipboard.writeText(viewURL.href);
        showSuccessToast('URL of plan and view copied to clipboard');
      } catch {
        showFailureToast('Error copying URL to clipboard');
      }
    }
  }

  function toggleTimelineLock() {
    if ($timelineLockStatus === TimelineLockStatus.Locked) {
      $timelineLockStatus = TimelineLockStatus.Unlocked;
    } else {
      $timelineLockStatus = TimelineLockStatus.Locked;
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />
<button
  class="st-button icon toggle-button"
  class:active={followSelection}
  on:click={onToggleFollowSelection}
  use:tooltip={{
    content: `${followSelection ? 'Disable' : 'Enable'} auto scroll to offscreen selections`,
    placement: 'bottom',
  }}
>
  <AutoScrollIcon />
</button>
<button
  class="st-button icon toggle-button"
  class:active={decimate}
  on:click={onToggleDecimation}
  use:tooltip={{ content: `${decimate ? 'Disable' : 'Enable'} decimation`, placement: 'bottom' }}
>
  <DecimateIcon />
</button>
<button
  class="st-button icon toggle-button"
  class:active={interpolateHoverValue}
  on:click={onToggleInterpolate}
  use:tooltip={{
    content: `${interpolateHoverValue ? 'Disable' : 'Enable'} cursor value interpolation`,
    placement: 'bottom',
  }}
>
  <InterpolateIcon />
</button>
<button
  class="st-button icon toggle-button"
  class:active={limitTooltipToLine}
  on:click={onLimitTooltipToLine}
  use:tooltip={{
    content: `${limitTooltipToLine ? 'Disable' : 'Enable'} cursor line intersection`,
    placement: 'bottom',
  }}
>
  <TooltipLineIcon />
</button>
<div class="timeline-icon-tray-divider" />
<button
  class="st-button icon toggle-button"
  class:active={showTimelineTooltip}
  on:click={onToggleTimelineTooltip}
  use:tooltip={{ content: `${showTimelineTooltip ? 'Hide' : 'Show'} timeline tooltip`, placement: 'bottom' }}
>
  <ShowTooltipIcon />
</button>
<TimelineInteractionModeControl
  timelineInteractionMode={$timelineInteractionMode}
  on:change={({ detail: mode }) => {
    $timelineInteractionMode = mode;
  }}
/>
<div class="timeline-icon-tray-divider" />
<button
  class="st-button icon"
  on:click={onNudgeLeft}
  use:tooltip={{ content: 'Shift Left', placement: 'bottom', shortcut: '[' }}
>
  <ArrowLeftIcon />
</button>
<button
  class="st-button icon"
  on:click={onNudgeRight}
  use:tooltip={{ content: 'Shift Right', placement: 'bottom', shortcut: ']' }}
>
  <ArrowRightIcon />
</button>
<button
  class="st-button icon"
  on:click={onZoomOut}
  use:tooltip={{ content: 'Zoom Out', placement: 'bottom', shortcut: '-' }}
>
  <MinusIcon />
</button>
<button
  class="st-button icon"
  on:click={onZoomIn}
  use:tooltip={{ content: 'Zoom In', placement: 'bottom', shortcut: '=' }}
>
  <PlusIcon />
</button>
<button
  class="st-button icon"
  on:click={onResetViewTimeRange}
  use:tooltip={{ content: 'Reset Visible Time Range', placement: 'bottom', shortcut: '0' }}
>
  <RotateCounterClockwiseIcon />
</button>
<div class="timeline-icon-tray-divider" />
<button
  class="st-button icon"
  on:click={copyViewToClipboard}
  use:tooltip={{
    content: `Copy URL including plan, visible time window, selection, and simulation dataset to clipboard.${
      $viewIsModified ? ' View has unsaved changes.' : ''
    }`,
    placement: 'bottom',
  }}
>
  <LinkIcon />
</button>
<TimelineLockControl
  hasUpdatePermission={hasUpdateDirectivePermission}
  planReadOnly={$planReadOnly}
  timelineLockStatus={$timelineLockStatus}
  on:lock={({ detail: lock }) => {
    $timelineLockStatus = lock;
  }}
  on:unlock={({ detail: unlock }) => {
    $timelineLockStatus = unlock;
  }}
  on:click={toggleTimelineLock}
/>
<div style="position: relative">
  <button
    class="st-button secondary timeline-view-controls-menu--button"
    use:tooltip={{ content: 'Timeline Options', placement: 'bottom' }}
    style="position: relative"
    on:click|stopPropagation={() => pickerMenu.toggle()}
  >
    <div class="button-inner"><ChevronDownIcon /></div>
  </button>
  <Menu bind:this={pickerMenu} hideAfterClick={false} placement="bottom-end">
    <div class="timeline-view-controls-menu">
      <div class="timeline-view-controls-menu--group">
        <div class="st-typography-medium">Actions</div>
        <Input layout="inline" class="timeline-view-control-menu--input">
          <label class="st-typography-label" for="autoscroll">
            <AutoScrollIcon />Auto scroll to selected activity
          </label>
          <input
            checked={followSelection}
            id="autoscroll"
            name="autoscroll"
            on:change={onToggleFollowSelection}
            type="checkbox"
          />
        </Input>
        <Input layout="inline" class="timeline-view-control-menu--input">
          <label class="st-typography-label" for="decimate">
            <DecimateIcon />Decimate data (lossless)
            <button
              class="st-button secondary docs-button"
              on:click|capture={event => {
                openDoc(
                  event,
                  'https://nasa-ammos.github.io/aerie-docs/planning/timeline-controls/#line-layer-decimation',
                );
              }}
            >
              Docs <ArrowUpRightIcon />
            </button>
          </label>
          <input checked={decimate} id="decimate" name="decimate" on:change={onToggleDecimation} type="checkbox" />
        </Input>
        <Input layout="inline" class="timeline-view-control-menu--input">
          <label class="st-typography-label" for="interpolate">
            <InterpolateIcon />Show interpolated values
            <button
              class="st-button secondary docs-button"
              on:click|capture={event => {
                openDoc(
                  event,
                  'https://nasa-ammos.github.io/aerie-docs/planning/timeline-controls/#cursor-value-interpolation',
                );
              }}
            >
              Docs <ArrowUpRightIcon />
            </button>
          </label>
          <input
            checked={interpolateHoverValue}
            id="interpolate"
            name="interpolate"
            on:change={onToggleInterpolate}
            type="checkbox"
          />
        </Input>
        <Input layout="inline" class="timeline-view-control-menu--input">
          <label class="st-typography-label" for="lockTimeline">
            <HorizontalDragIcon />Drag and drop to move activities
          </label>
          <input
            checked={$timelineLockStatus === TimelineLockStatus.Unlocked}
            id="lockTimeline"
            name="lockTimeline"
            on:change={toggleTimelineLock}
            type="checkbox"
          />
        </Input>
      </div>
      <div class="timeline-view-controls-menu--group">
        <div class="st-typography-medium">Tooltips</div>
        <Input layout="inline" class="timeline-view-control-menu--input">
          <label class="st-typography-label" for="toggleTooltipVisibility">
            <ShowTooltipIcon />Show tooltip
          </label>
          <input
            checked={showTimelineTooltip}
            id="toggleTooltipVisibility"
            name="toggleTooltipVisibility"
            on:change={onToggleTimelineTooltip}
            type="checkbox"
          />
        </Input>
        <Input layout="inline" class="timeline-view-control-menu--input">
          <label class="st-typography-label" for="toggleTooltipLine">
            <TooltipLineIcon />Limit tooltip to line
          </label>
          <input
            checked={limitTooltipToLine}
            id="toggleTooltipLine"
            name="toggleTooltipLine"
            on:change={onLimitTooltipToLine}
            type="checkbox"
          />
        </Input>
      </div>
      <div class="timeline-view-controls-menu--group">
        <div class="st-typography-medium">Current View</div>
        <div class="st-typography-body">Includes current plan, time window, selection, and simulation dataset</div>
        <div class="timeline-view-controls--input">
          <button
            use:tooltip={{ content: `Copy to clipboard`, placement: 'top' }}
            class="st-button icon"
            on:click={copyViewToClipboard}><ClipboardIcon /></button
          >
          <input readonly class="st-input" value={viewURL?.href} />
        </div>
      </div>
    </div>
  </Menu>
</div>

<style>
  .st-button.timeline-view-controls-menu--button {
    padding: 0;
    width: 32px;
  }

  .button-inner {
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;
    padding: 0;
    position: relative;
    width: 100%;
    z-index: 1;
  }

  .timeline-view-controls-menu {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    width: 340px;
  }

  .timeline-view-controls-menu--group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    user-select: none;
    white-space: normal;
  }

  .timeline-view-controls-menu--group .st-typography-body {
    color: var(--st-gray-60);
  }

  .docs-button {
    color: var(--st-gray-60);
    display: flex;
    gap: 2px;
    height: 16px;
    margin-left: auto;
    padding: 0px 4px;
  }

  /* TODO fix this icon */
  .docs-button :global(svg) {
    color: var(--st-gray-40);
    height: 12px;
    width: 12px;
  }

  :global(.timeline-view-control-menu--input.input.input-inline) {
    gap: 12px;
    grid-template-columns: 1fr min-content;
    height: 24px;
    padding: 0;
  }

  :global(.timeline-view-control-menu--input label) {
    display: flex;
    gap: 8px;
    user-select: none;
  }

  :global(.timeline-view-control-menu--input label svg) {
    color: var(--st-gray-80);
  }

  .timeline-view-controls--input {
    display: flex;
    gap: 8px;
  }

  .timeline-view-controls--input input {
    flex: 1;
  }
</style>
