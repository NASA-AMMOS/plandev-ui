<svelte:options immutable={true} />

<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import ConstraintViolations from './ConstraintViolations.svelte';
  import RowXAxisTicks from './RowXAxisTicks.svelte';

  export let constraintViolations: ConstraintViolation[] = [];
  export let drawHeight: number = 70;
  export let drawWidth: number = 0;
  export let marginLeft: number = 50;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let xTicksView: XAxisTick[] = [];

  let axisOffset = 12;
  let violationsOffset = 0;
</script>

<svg style="height: {drawHeight}px;">
  <g transform="translate({marginLeft}, 0)">
    <g transform="translate(0, {drawHeight - axisOffset * 2 + 4})">
      <RowXAxisTicks drawHeight={axisOffset * 2} {xScaleView} {xTicksView} />
    </g>
    <g transform="translate(0, {axisOffset})">
      <g fill="none" class="ticks" text-anchor="left">
        {#if drawWidth > 0}
          {#each xTicksView as tick}
            {#if !tick.hideLabel}
              <g class="tick st-typography-label" transform="translate({xScaleView(tick.date)}, 0)">
                <text fill="currentColor" dy="0.5em">{tick.coarseTime}</text>
              </g>
              <g class="tick st-typography-body" transform="translate({xScaleView(tick.date)}, 20)">
                <text fill="currentColor" dy="0.5em">{tick.fineTime}</text>
              </g>
            {/if}
          {/each}
        {/if}
      </g>
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

  .ticks :global(g) {
    font-family: Inter, Helvetica, Sans-Serif;
    font-size: 11px;
  }
</style>
