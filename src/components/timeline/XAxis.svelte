<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ScaleTime } from 'd3-scale';
  import ConstraintViolations from './ConstraintViolations.svelte';
  import XAxisBrush from './XAxisBrush.svelte';
  import XAxisVerticalGuides from './XAxisVerticalGuides.svelte';
  import { tooltip } from '../../utilities/tooltip';

  export let constraintViolations: ConstraintViolation[] = [];
  export let drawHeight: number = 90;
  export let drawWidth: number = 0;
  export let marginLeft: number = 50;
  export let verticalGuides: VerticalGuide[] = [];
  export let viewTimeRange: TimeRange | null = null;
  export let xScaleMax: ScaleTime<number, number> | null = null;
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let xTicksView: XAxisTick[] = [];

  const dispatch = createEventDispatcher();

  let axisOffset = 55;
  let violationsOffset = 20;
  let verticalGuidesOffset = 35;
</script>

<svg style="height: {drawHeight}px">
  <g transform="translate({marginLeft}, 0)">
    <g transform="translate(0, 0)">
      <g transform="translate(-14, 22)">
        <text
          class="reset-view-time-range-icon"
          on:click={() => dispatch('resetViewTimeRange')}
          use:tooltip={{
            content: 'Reset Time',
            placement: 'left',
          }}
        >
          &#xf117;
        </text>
      </g>
    </g>
    <g transform="translate(0, 0)">
      <XAxisBrush
        drawHeight={20}
        {drawWidth}
        type="max"
        {viewTimeRange}
        {xScaleMax}
        {xScaleView}
        yOffset={10}
        on:viewTimeRangeChanged
      />
    </g>
    <g transform="translate(0, {violationsOffset})">
      <ConstraintViolations
        {constraintViolations}
        mousemove={undefined}
        mouseout={undefined}
        {drawHeight}
        {drawWidth}
        {viewTimeRange}
        {xScaleView}
      />
    </g>
    <g transform="translate(0, {verticalGuidesOffset})">
      <XAxisVerticalGuides
        {drawHeight}
        {drawWidth}
        {verticalGuides}
        {viewTimeRange}
        {xScaleView}
        on:collapsedVerticalGuides
      />
    </g>
    <g transform="translate(0, {axisOffset})">
      <XAxisBrush
        drawHeight={30}
        {drawWidth}
        type="view"
        {viewTimeRange}
        {xScaleMax}
        {xScaleView}
        yOffset={-10}
        on:viewTimeRangeChanged
      />
      <g fill="none" font-size="10" text-anchor="middle">
        {#if drawWidth > 0}
          {#each xTicksView as tick}
            <g class="tick" transform="translate({xScaleView(tick.date)}, 0)">
              <text fill="currentColor" dy="0.5em">{tick.yearDay}</text>
            </g>
            <g class="tick" transform="translate({xScaleView(tick.date)}, 20)">
              <text fill="currentColor" dy="0.5em">{tick.time}</text>
            </g>
          {/each}
        {/if}
      </g>
    </g>
  </g>
</svg>

<style>
  svg {
    height: 100%;
    width: 100%;
  }

  text {
    pointer-events: none;
    user-select: none;
  }

  .reset-view-time-range-icon {
    cursor: pointer;
    fill: var(--st-gray-50);
    font-family: bootstrap-icons;
    font-size: 12px;
    pointer-events: all;
  }

  .reset-view-time-range-icon:hover {
    fill: var(--st-gray-70);
  }
</style>
