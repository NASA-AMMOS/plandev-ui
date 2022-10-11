<svelte:options immutable={true} />

<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import ConstraintViolations from './ConstraintViolations.svelte';
  import XAxisVerticalGuides from './XAxisVerticalGuides.svelte';

  export let constraintViolations: ConstraintViolation[] = [];
  export let drawHeight: number = 90;
  export let drawWidth: number = 0;
  export let marginLeft: number = 50;
  export let verticalGuides: VerticalGuide[] = [];
  export let viewTimeRange: TimeRange | null = null;
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let xTicksView: XAxisTick[] = [];

  let axisOffset = 24;
  let violationsOffset = 16;
  let verticalGuidesOffset = 10;
</script>

<svg style="height: {drawHeight}px;">
  <g transform="translate({marginLeft}, 0)">
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
      <XAxisVerticalGuides {drawHeight} {drawWidth} {verticalGuides} {viewTimeRange} {xScaleView} />
    </g>
    <g transform="translate(0, {axisOffset})">
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
</style>
