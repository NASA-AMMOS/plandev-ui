<svelte:options immutable={true} />

<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import type { ConstraintResult } from '../../types/constraint';
  import type { TimeRange, XAxisTick } from '../../types/timeline';
  import { getTimeZoneName } from '../../utilities/time';
  import ConstraintViolations from './ConstraintViolations.svelte';
  import RowXAxisTicks from './RowXAxisTicks.svelte';

  export let constraintResults: ConstraintResult[] = [];
  export let drawHeight: number = 70;
  export let drawWidth: number = 0;
  export let marginLeft: number = 50;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let xTicksView: XAxisTick[] = [];

  const userTimeZone = getTimeZoneName();

  let axisOffset = 12;
  let violationsOffset = 0;
</script>

<div style="height: {drawHeight}px;" class="x-axis-content">
  <div class="x-axis-time-formats" style={`width:${marginLeft}px`}>
    <div class="x-axis-time-format st-typography-medium">UTC</div>
    <div class="x-axis-time-format x-axis-time-format-secondary st-typography-medium">
      {userTimeZone}
    </div>
  </div>
  <svg style="height: {drawHeight}px; width: 100%">
    <g>
      <g transform="translate(0, {drawHeight - axisOffset * 2 + 4})">
        <RowXAxisTicks drawHeight={axisOffset * 2} {xScaleView} {xTicksView} />
      </g>
      <g transform="translate(0, {axisOffset})">
        <g fill="none" class="ticks" text-anchor="left">
          {#if drawWidth > 0}
            {#each xTicksView as tick}
              {#if !tick.hideLabel}
                <g class="tick st-typography-medium" transform="translate({xScaleView?.(tick.date)}, 0)">
                  <text fill="currentColor" dy="0.5em">{tick.formattedDateUTC}</text>
                </g>
                <g
                  class="tick st-typography-medium tick-secondary"
                  transform="translate({xScaleView?.(tick.date)}, 16)"
                >
                  <text fill="currentColor" dy="0.5em">{tick.formattedDateLocal}</text>
                </g>
              {/if}
            {/each}
          {/if}
        </g>
      </g>
      <g transform="translate(0, {violationsOffset})">
        <ConstraintViolations
          {constraintResults}
          mousemove={undefined}
          mouseout={undefined}
          {drawHeight}
          {drawWidth}
          {viewTimeRange}
          {xScaleView}
        />
      </g>
    </g>
  </svg>
</div>

<style>
  svg {
    height: 100%;
    width: 100%;
  }

  text {
    pointer-events: none;
    user-select: none;
  }

  .ticks :global(g) {
    font-family: Inter, Helvetica, Sans-Serif;
    font-size: 10px;
  }

  .x-axis-time-formats {
    align-items: flex-end;
    background: #fafafa; /* TODO what stellar color? */
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    height: 100%;
    padding: 6px 8px 4px;
    user-select: none;
  }

  .x-axis-time-format {
    color: var(--st-gray-60);
    display: flex;
    font-size: 10px;
    width: max-content;
  }

  .x-axis-time-format-secondary {
    opacity: 0.5;
  }

  .x-axis-content {
    border-bottom: 1px solid var(--st-gray-20);
    display: flex;
  }

  .tick {
    color: var(--st-gray-60);
  }

  .tick-secondary {
    opacity: 0.5;
  }
</style>
