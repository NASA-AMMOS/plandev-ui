<svelte:options immutable={true} />

<script lang="ts">
  import { brushX, type D3BrushEvent } from 'd3-brush';
  import type { ScaleTime } from 'd3-scale';
  import { select, type Selection } from 'd3-selection';
  import { createEventDispatcher } from 'svelte';
  import { clamp } from '../../utilities/generic';
  import { getDoyTime, getDurationInMs, getUnixEpochTime } from '../../utilities/time';
  import { tooltip } from '../../utilities/tooltip';

  export let activities: Activity[] = [];
  export let constraintViolations: ConstraintViolation[] = [];
  export let cursorEnabled: boolean = true;
  export let drawHeight: number = 40;
  export let drawWidth: number = 0;
  export let marginLeft: number = 50;
  export let mouseOver: MouseOver;
  export let viewTimeRange: TimeRange | null = null;
  export let xScaleMax: ScaleTime<number, number> | null = null;
  export let xScaleView: ScaleTime<number, number> | null = null;

  const dispatch = createEventDispatcher();

  let activityHistValues: number[] = [];
  let activityHistMax = 0;
  let brush: Selection<SVGGElement, unknown, null, undefined>;
  let brushing = false;
  let constraintViolationsToRender: { width: number; x: number }[] = [];
  let cursorLeft = 0;
  let cursorTooltip = '';
  let cursorVisible = false;
  let drawingRange = false;
  let gTimeSelectorContainer: SVGGElement;
  let histogramContainer: HTMLDivElement;
  let movingSlider = false;
  let numBinsMax = 300;
  let numBinsMin = 50;
  let resizingSliderLeft = false;
  let resizingSliderRight = false;
  let timelineHovering = false;

  $: if (drawWidth) {
    const xBrush = brushX()
      .extent([
        [0, 0],
        [drawWidth, drawHeight],
      ])
      .on('start', (event: D3BrushEvent<number[]>) => {
        brushed(event);
      })
      .on('brush', (event: D3BrushEvent<number[]>) => {
        brushing = true;
        if (!event.sourceEvent || !event.selection) {
          return;
        }

        // Force positioning of hover cursor and tooltip
        const handleWest = brush.select('.handle--w').node() as SVGRectElement;
        const handleWidth = 6; // D3's default handle width
        const handleWestRect = handleWest.getBoundingClientRect();
        const handleWestX = handleWestRect.x;
        const handleWestWidth = handleWestRect.width;
        const handleWestEnd = handleWestX + handleWestWidth;
        if (event.mode === 'handle') {
          const sourceX = event.sourceEvent.x;
          // Do some basic hit detection since there is no way to determine through D3 which handle is
          // being dragged

          // West handle intersection, pad by 1 for differences between hit detection between D3 and browsers
          if (sourceX + 1 >= handleWestX && sourceX - 1 <= handleWestEnd) {
            onMouseMove(handleWestX + handleWidth / 2, 0, false); // 3px is half of the handle width
          } else {
            // East handle intersection
            const handleEast = brush.select('.handle--e').node() as SVGRectElement;
            const handleEastRect = handleEast.getBoundingClientRect();
            const handleEastX = handleEastRect.x;
            const handleEastWidth = handleEastRect.width;
            const handleEastEnd = handleEastX + handleEastWidth;
            if (sourceX >= handleEastX && sourceX <= handleEastEnd) {
              onMouseMove(handleEastX + handleWidth / 2, 0, false);
            }
          }
        } else {
          // When dragging the selection box, snap the tooltip to the start time bound
          onMouseMove(handleWestX + handleWidth / 2, 0, false);
        }

        brushed(event);
      })

      .on('end', (event: D3BrushEvent<number[]>) => {
        brushing = false;
        if (!event.sourceEvent) {
          return;
        }

        let start: number;
        let end: number;
        if (!event.selection) {
          const unixEpochTime = xScaleMax.invert(event.sourceEvent.offsetX).getTime();
          const startDate = new Date(viewTimeRange.start).getTime();
          const endDate = new Date(viewTimeRange.end).getTime();
          const unixEpochTimeDuration = endDate - startDate;
          // Center slider on user's mouse position
          start = unixEpochTime - unixEpochTimeDuration / 2;
          end = unixEpochTime + unixEpochTimeDuration / 2;

          // Ensure slider is within bounds
          const windowStartTime = xScaleMax.invert(windowMax).getTime();
          const windowEndTime = xScaleMax.invert(windowMin).getTime();
          if (unixEpochTimeDuration > windowEndTime - windowStartTime) {
            // Cover case where duration could be unexpectedly large
            start = windowStartTime;
            end = windowEndTime;
          } else if (start < windowStartTime) {
            // Case where slider comes before entire window time range
            start = windowStartTime;
            end = start + unixEpochTimeDuration;
          } else if (end > windowEndTime) {
            // Case where slider comes after entire window time range
            end = windowEndTime;
            start = end - unixEpochTimeDuration;
          }
        } else {
          start = xScaleMax.invert(event.selection[0] as number).getTime();
          end = xScaleMax.invert(event.selection[1] as number).getTime();
          brushed(event);
        }

        const newViewTimeRange = { end, start };
        dispatch('viewTimeRangeChanged', newViewTimeRange);
      });

    brush = select(gTimeSelectorContainer).call(xBrush);
    const extent = [new Date(viewTimeRange.start), new Date(viewTimeRange.end)].map(xScaleMax);
    brush.call(xBrush.move, extent);
  }

  $: histogramHeight = (drawHeight / 5) * 2;
  $: selectorHandleHeight = drawHeight / 1.9;
  $: numBins = Math.max(Math.min(numBinsMax, parseInt((drawWidth / 5).toString())), numBinsMin);

  $: if (mouseOver && mouseOver.e.offsetX >= 0 && mouseOver.e.offsetX <= drawWidth) {
    const unixEpochTime = xScaleView.invert(mouseOver.e.offsetX).getTime();
    cursorLeft = xScaleMax(unixEpochTime);
    cursorVisible = true;
  } else {
    cursorVisible = false;
  }

  $: windowMax = xScaleMax?.range()[0];
  $: windowMin = xScaleMax?.range()[1];

  // Update histograms if xScaleMax, activities, or constraint violation changes
  $: if ((xScaleMax || activities || constraintViolations) && windowMin - windowMax > 0) {
    activityHistValues = [];
    const windowStartTime = xScaleMax.invert(windowMax).getTime();
    const windowEndTime = xScaleMax.invert(windowMin).getTime();
    const binSize = (windowEndTime - windowStartTime) / numBins - 1;

    // Compute activity histogram
    activityHistValues = Array(numBins).fill(0);
    activities.forEach(activity => {
      const activityX = getUnixEpochTime(activity.start_time_doy);
      const activityDuration = getDurationInMs(activity.duration);

      // Filter out points that do not fall within the plan bounds at all
      if (activityX > windowEndTime || activityX + activityDuration < windowStartTime) {
        return;
      }

      // Figure out which start bin this is in
      const startBin = Math.floor((activityX - windowStartTime) / binSize);
      activityHistValues[startBin]++;

      // Figure out which other bins this value is in
      const x = Math.floor(activityDuration / binSize) + 1;
      for (let i = 1; i < x; i++) {
        if (startBin + i >= activityHistValues.length) {
          return;
        }
        activityHistValues[startBin + i]++;
      }
    });

    activityHistMax = Math.max(...activityHistValues);

    // Compute constraint violations histogram
    constraintViolationsToRender = [];
    constraintViolations.forEach(violation => {
      violation.windows.forEach(w => {
        const xStart = xScaleMax(w.start);
        const xEnd = xScaleMax(w.end);
        const clampedStart = xStart < 0 ? 0 : xStart;
        const clampedEnd = xEnd > drawWidth ? drawWidth : xEnd;
        const width = clampedEnd - clampedStart;
        const clampedWidth = width <= 0 ? 5 : width;
        constraintViolationsToRender.push({ width: clampedWidth, x: clampedStart });
      });
    });
  }

  function brushed({ selection }) {
    if (!selection || selection[1] - selection[0] === 0) {
      brush.attr('display', 'none');
    } else {
      brush.attr('display', 'initial');
    }

    brush.selectAll('.selection').attr('rx', '4px');

    brush
      .selectAll('.handle')
      .attr('height', `${selectorHandleHeight}px`)
      .attr('y', `${drawHeight / 1.9 / 2}px`)
      .attr('rx', '4px');
  }

  function onMouseMove(x: number, y: number, checkY: boolean = true) {
    const histRect = histogramContainer.getBoundingClientRect();
    const mouseWithinLeftHorizontalHistogramBounds = x >= histRect.x - 1; // Add a bit of padding due to hit detection differences between D3 and browser
    const mouseWithinRightHorizontalHistogramBounds = x <= histRect.right + 1; // Add a bit of padding due to hit detection differences between D3 and browser
    const mouseWithinHorizontalHistogramBounds =
      mouseWithinLeftHorizontalHistogramBounds && mouseWithinRightHorizontalHistogramBounds;
    const mouseWithinVerticalHistogramBounds = checkY ? y >= histRect.y && y <= histRect.bottom : true;

    // Check if mouse is within histogram position bounds
    if (mouseWithinVerticalHistogramBounds && mouseWithinHorizontalHistogramBounds) {
      // Update hover cursor
      timelineHovering = true;
      cursorLeft = clamp(x - histRect.left, 0, histRect.width); // Ensure cursor is within range
      const cursorTime = xScaleMax.invert(cursorLeft);
      cursorTooltip = getDoyTime(cursorTime, false);

      // Only dispatch a cursor change if we're just hovering
      if (!movingSlider && !drawingRange && !resizingSliderLeft && !resizingSliderRight) {
        dispatch('cursorTimeChange', cursorTime);
      }
    } else {
      timelineHovering = false;
      dispatch('cursorTimeChange', null);
    }
  }

  function onWindowMouseMove(e: MouseEvent) {
    onMouseMove(e.x, e.y);
  }
</script>

<div
  bind:this={histogramContainer}
  class="timeline-histogram"
  style={`margin-left: ${marginLeft}px; width: ${drawWidth}px; height: ${drawHeight}px;`}
>
  <div class="timeline-histogram-background" />
  <div
    use:tooltip={{
      content: cursorTooltip,
      hideOnClick: false,
      placement: 'top',
      showOnInit: true,
      triggerTarget: histogramContainer,
    }}
    class="timeline-histogram-cursor"
    style={`left: ${cursorLeft}px; opacity: ${
      brushing || (!timelineHovering && !cursorEnabled) || (!brushing && !timelineHovering && !cursorVisible) ? 0 : 1
    }`}
  />

  <div
    class="histogram blue"
    style={`height: ${
      constraintViolationsToRender.length ? histogramHeight * 1.5 : histogramHeight * 2
    }px; border-bottom: ${constraintViolationsToRender.length < 1 ? '1px solid var(--st-gray-20)' : 'none'}`}
  >
    {#each activityHistValues as bin, index (index)}
      <div class="bin" style={`height: ${(bin / activityHistMax) * 100}%;`} />
    {/each}
  </div>
  {#if constraintViolationsToRender.length}
    <div class="constraint-violations" style={`height: ${histogramHeight / 2}px`}>
      {#each constraintViolationsToRender as violation}
        <div class="constraint-violation" style={`left: ${violation.x}px; width: ${violation.width}px`} />
      {/each}
    </div>
  {/if}
  {#if drawWidth > 0}
    <svg>
      <g bind:this={gTimeSelectorContainer} />
    </svg>
  {/if}
</div>

<svelte:window on:mousemove={onWindowMouseMove} />

<style>
  .timeline-histogram {
    background: var(--st-white);
    display: flex;
    flex-direction: row;
    flex-direction: column;
    gap: 2px;
    justify-content: center;
    position: relative;
  }

  .timeline-histogram-background {
    cursor: pointer;
    height: 100%;
    position: absolute;
    width: 100%;
    z-index: 0;
  }

  .timeline-histogram-cursor {
    background-color: var(--st-gray-80);
    cursor: move;
    height: 100%;
    left: 0;
    pointer-events: none;
    position: absolute;
    top: 0;
    width: 1px;
    z-index: 0;
  }

  .histogram {
    align-items: flex-end;
    display: flex;
    flex-direction: row;
    gap: 1px;
  }

  .histogram.blue .bin {
    background: rgba(47, 128, 237, 1);
  }

  .bin {
    flex: 1;
    transition: height 75ms ease-out;
    width: 2px;
  }

  .constraint-violations {
    position: relative;
  }

  .constraint-violation {
    background: rgba(235, 87, 87, 0.2);
    height: 100%;
    position: absolute;
  }

  svg {
    height: 100%;
    overflow: visible;
    position: absolute;
    top: 0;
    width: 100%;
  }

  svg :global(.selection) {
    fill: none;
    shape-rendering: auto;
    stroke: black;
    stroke-width: 1px;
  }

  svg :global(.handle) {
    fill: white;
    stroke: black;
  }

  svg :global(.handle:hover),
  svg :global(.handle:active) {
    fill: #e0e0e0;
  }
</style>
