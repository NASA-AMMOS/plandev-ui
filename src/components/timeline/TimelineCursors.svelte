<script lang="ts">
  type ComputedVerticalGuide = { id: number; label: Label; maxWidth: number; x: number };

  import type { ScaleTime } from 'd3-scale';
  import { createEventDispatcher } from 'svelte';
  import { view } from '../../stores/views';
  import type { Label, MouseOver, Timeline, VerticalGuide } from '../../types/timeline';
  import { getDoyTime, getUnixEpochTime } from '../../utilities/time';
  import { createVerticalGuide } from '../../utilities/timeline';
  import TimelineCursor from './TimelineCursor.svelte';

  export let cursorEnabled: boolean = true;
  export let cursorHeaderHeight: number = 20;
  export let drawWidth: number = 0;
  export let marginLeft: number = 50;
  export let mouseOver: MouseOver | null;
  export let histogramCursorTime: Date | null = null;
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let verticalGuides: VerticalGuide[] = [];

  const dispatch = createEventDispatcher();

  $: onCursorEnableChange(cursorEnabled);
  $: if (mouseOver !== undefined || histogramCursorTime !== undefined) {
    onMouseOver(mouseOver);
    onHistogramCursorTime(histogramCursorTime);
  }
  $: onVerticalGuidesChange(verticalGuides, xScaleView, drawWidth);
  $: if ($view !== null) {
    timelines = $view.definition.plan.timelines;
  }

  let offsetX: number = -1;
  let cursorX: number = 0;
  let cursorMaxWidth: number = 0;
  let cursorDOY: string = '';
  let computedVerticalGuides: ComputedVerticalGuide[] = [];
  let cursorWithinView = true;
  let timelines: Timeline[] = [];

  /**
   * Sort vertical guides in time order descending.
   */
  function sortVerticalGuides(verticalGuides: VerticalGuide[]): VerticalGuide[] {
    return [...verticalGuides].sort((a: VerticalGuide, b: VerticalGuide) => {
      const aTime = getUnixEpochTime(a.timestamp);
      const bTime = getUnixEpochTime(b.timestamp);
      return bTime - aTime;
    });
  }

  function onVerticalGuidesChange(
    verticalGuides: VerticalGuide[],
    xScaleView: ScaleTime<number, number> | null,
    drawWidth: number,
  ) {
    let sortedVerticalGuides = sortVerticalGuides(verticalGuides);
    let tempComputedVerticalGuides: ComputedVerticalGuide[] = [];

    sortedVerticalGuides.forEach((verticalGuide, i) => {
      if (xScaleView) {
        let unixEpochTime = getUnixEpochTime(verticalGuide.timestamp);
        let x = xScaleView(unixEpochTime);
        let maxWidth = 0;

        if (x < 0 || x > drawWidth) {
          return;
        }

        // The maxWidth of the last vertical guide is its x position to edge of the drawWidth
        // otherwise the maxWidth is the difference from x position of the previous vertical guide
        if (!tempComputedVerticalGuides[i - 1]) {
          maxWidth = drawWidth - x;
        } else {
          maxWidth = tempComputedVerticalGuides[i - 1].x - x - 20 - marginLeft;
        }

        tempComputedVerticalGuides.push({
          id: verticalGuide.id,
          label: verticalGuide.label,
          maxWidth,
          x: x + marginLeft,
        });
      }
    });

    computedVerticalGuides = tempComputedVerticalGuides;
  }

  function removeVerticalGuide(verticalGuideId: number) {
    const filteredVerticalGuides = verticalGuides.filter(guide => guide.id !== verticalGuideId);
    dispatch('updateVerticalGuides', filteredVerticalGuides);
  }

  function addVerticalGuide(doyTimestamp: string) {
    const newVerticalGuide = createVerticalGuide(timelines, doyTimestamp);
    dispatch('updateVerticalGuides', [...verticalGuides, newVerticalGuide]);
    cursorWithinView = false; // Hide active cursor that would overlap the created guide until mouse is moved again
  }

  function onMouseOver(event: MouseOver | null) {
    if (event && xScaleView) {
      offsetX = event.e.offsetX;
    } else {
      offsetX = -1;
    }
    updateCursor();
  }

  function onHistogramCursorTime(date: Date | null) {
    if (!cursorEnabled || !date) {
      return;
    }

    let dateWithinView = true;
    if (xScaleView === null) {
      dateWithinView = false;
    }

    if (xScaleView !== null) {
      const viewStart = xScaleView.domain()[0];
      const viewEnd = xScaleView.domain()[1];

      if (date < viewStart || date > viewEnd) {
        dateWithinView = false;
      }
    }

    if (dateWithinView) {
      updateCursor();
    } else {
      cursorWithinView = false;
    }
  }

  function onCursorEnableChange(cursorEnabled: boolean) {
    if (cursorEnabled) {
      updateCursor();
    }
  }

  function updateCursor() {
    if ((cursorEnabled && offsetX >= 0 && offsetX <= drawWidth) || histogramCursorTime) {
      let unixEpochTime = 0;
      if (xScaleView !== null) {
        if (histogramCursorTime) {
          unixEpochTime = histogramCursorTime.getTime();
          cursorDOY = getDoyTime(new Date(unixEpochTime));
          cursorX = xScaleView(unixEpochTime);
        } else {
          unixEpochTime = xScaleView.invert(offsetX).getTime();
          cursorDOY = getDoyTime(new Date(unixEpochTime));
          cursorX = offsetX;
        }
      }
      cursorMaxWidth = drawWidth - cursorX;
      cursorX = cursorX + marginLeft;
      cursorWithinView = true;
    } else {
      cursorWithinView = false;
    }
  }
</script>

<div class="timeline-cursor-margin" style="height: {cursorHeaderHeight}px" />
<div class="timeline-cursor-container">
  <div class="timeline-cursor-header" />
  {#each computedVerticalGuides as guide}
    <TimelineCursor
      color={guide.label.color}
      x={guide.x}
      label={guide.label.text}
      maxWidth={guide.maxWidth}
      on:click={() => removeVerticalGuide(guide.id)}
    />
  {/each}
  {#if cursorEnabled && cursorWithinView}
    <TimelineCursor
      x={cursorX}
      label={`${cursorDOY} UTC`}
      maxWidth={cursorMaxWidth}
      on:click={() => addVerticalGuide(cursorDOY)}
      activeCursor
    />
  {/if}
</div>

<style>
  .timeline-cursor-margin {
    position: relative;
  }

  .timeline-cursor-container {
    height: 100%;
    pointer-events: none;
    position: absolute;
    width: 100%;
    z-index: 4;
  }

  .timeline-cursor-header {
    height: 1rem;
    position: relative;
  }
</style>
