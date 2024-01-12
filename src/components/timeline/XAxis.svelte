<svelte:options immutable={true} />

<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import { select, type Selection } from 'd3-selection';
  import { zoom as d3Zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
  import { createEventDispatcher } from 'svelte';
  import type { ConstraintResultWithName } from '../../types/constraint';
  import type { TimeRange, XAxisTick } from '../../types/timeline';
  import { getTimeZoneName } from '../../utilities/time';
  import { TimelineInteractionMode } from '../../utilities/timeline';
  import ConstraintViolations from './ConstraintViolations.svelte';
  import RowXAxisTicks from './RowXAxisTicks.svelte';

  export let constraintResults: ConstraintResultWithName[] = [];
  export let drawHeight: number = 70;
  export let drawWidth: number = 0;
  export let marginLeft: number = 50;
  export let timelineInteractionMode: TimelineInteractionMode;
  export let timelineZoomTransform: ZoomTransform | null;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let xTicksView: XAxisTick[] = [];

  const dispatch = createEventDispatcher();
  const userTimeZone = getTimeZoneName();

  let axisOffset = 12;
  let violationsOffset = 0;
  let svg: SVGElement;
  let zoom: ZoomBehavior<SVGElement, unknown>;

  $: svgSelection = select(svg) as Selection<SVGElement, unknown, any, any>;

  /* TODO could this be a custom svelte use action? */
  $: if (svgSelection && drawWidth) {
    zoom = d3Zoom<SVGElement, unknown>()
      .on('zoom', zoomed)
      .scaleExtent([1, Infinity])
      .translateExtent([
        [0, 0],
        [drawWidth, drawHeight],
      ])
      .filter((e: WheelEvent) => {
        return timelineInteractionMode === TimelineInteractionMode.Navigate || e.button === 1;
      })
      .wheelDelta((e: WheelEvent) => {
        // Override default d3 wheelDelta function to remove ctrl key for modifying zoom amount
        // https://d3js.org/d3-zoom#zoom_wheelDelta
        return -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 0.002);
      });
    svgSelection.call(zoom.transform, timelineZoomTransform || zoomIdentity);
    svgSelection.call(zoom);
  }

  $: if (timelineZoomTransform && svgSelection) {
    // Set transform if it has changed (from other rows or elsewhere), causes zoomed event to fire
    svgSelection.call(zoom.transform, timelineZoomTransform);
  }

  function zoomed(e: D3ZoomEvent<HTMLCanvasElement, any>) {
    // Prevent dispatch when zoom did not originate from this row (i.e. propagated from zoomTransform)
    if (e.transform && timelineZoomTransform && e.transform.toString() === timelineZoomTransform.toString()) {
      return;
    }
    dispatch('zoom', e);
  }
</script>

<div
  style="cursor: {timelineInteractionMode === TimelineInteractionMode.Navigate ? 'move' : ''}; height: {drawHeight}px;"
  class="x-axis-content"
>
  <div class="x-axis-time-formats" style={`width:${marginLeft}px`}>
    <div class="x-axis-time-format st-typography-medium">UTC</div>
    <div class="x-axis-time-format x-axis-time-format-secondary st-typography-medium">
      {userTimeZone}
    </div>
  </div>
  <svg style="height: {drawHeight}px; width: {drawWidth}px;" bind:this={svg}>
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
