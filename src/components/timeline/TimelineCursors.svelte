<script lang="ts">
  type ComputedVerticalGuide = { id: number; label: Label; maxWidth: number; x: number };
  type ComputedVerticalBand = {
    anchorAtStart: boolean;
    duration: string;
    id: number;
    label: Label;
    showEndEdge: boolean;
    showStartEdge: boolean;
    width: number;
    x: number;
  };

  import type { ScaleTime } from 'd3-scale';
  import { createEventDispatcher } from 'svelte';
  import { plugins } from '../../stores/plugins';
  import { view } from '../../stores/views';
  import type { Label, MouseOver, Timeline, VerticalGuide } from '../../types/timeline';
  import { formatDate, getDoyTime, getUnixEpochTime } from '../../utilities/time';
  import { hexToRgba } from '../../utilities/color';
  import {
    clampGuideBand,
    createVerticalGuide,
    formatBandDuration,
    GUIDE_BAND_OPACITY,
  } from '../../utilities/timeline';
  import TimelineCursor from './TimelineCursor.svelte';

  /** Fallback band color, for a guide saved with no color of its own. Matches the cursor line's gray. */
  const DEFAULT_BAND_COLOR = '#a1a1a1';

  export let cursorEnabled: boolean = true;
  export let cursorHeaderHeight: number = 20;
  export let drawWidth: number = 0;
  export let marginLeft: number = 50;
  export let mouseOver: MouseOver | null;
  export let histogramCursorTime: Date | null = null;
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let verticalGuides: VerticalGuide[] = [];

  const dispatch = createEventDispatcher<{
    updateVerticalGuides: VerticalGuide[];
  }>();

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
  let cursorMaxWidthFlipped: number = 0;
  let cursorTimeLabel: string = '';
  let computedVerticalGuides: ComputedVerticalGuide[] = [];
  /**
   * Bands are computed separately from the guide markers rather than folded into
   * ComputedVerticalGuide, because the two have different visibility rules: a marker is dropped once
   * its own x leaves the view, while a band whose start is off-screen must still shade the part of the
   * region that is on-screen. Keeping them apart leaves the marker path byte-for-byte as it was.
   */
  let computedVerticalBands: ComputedVerticalBand[] = [];
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

    const tempComputedVerticalBands: ComputedVerticalBand[] = [];
    for (const verticalGuide of verticalGuides) {
      if (!xScaleView || verticalGuide.timestamp2 === undefined) {
        continue;
      }
      const anchorMs = getUnixEpochTime(verticalGuide.timestamp);
      const extentMs = getUnixEpochTime(verticalGuide.timestamp2);
      const band = clampGuideBand(xScaleView(anchorMs), xScaleView(extentMs), drawWidth);
      if (band === null) {
        continue;
      }
      tempComputedVerticalBands.push({
        anchorAtStart: band.anchorAtStart,
        // From the timestamps, not from the clamped pixel width: the readout is how long the region
        // lasts, which does not change because the view scrolled half of it off screen.
        duration: formatBandDuration(extentMs - anchorMs),
        id: verticalGuide.id,
        label: verticalGuide.label,
        showEndEdge: band.showEndEdge,
        showStartEdge: band.showStartEdge,
        width: band.end - band.start,
        // marginLeft matches how the guide markers are offset, so a band lines up with its own marker
        x: band.start + marginLeft,
      });
    }
    computedVerticalBands = tempComputedVerticalBands;
  }

  /**
   * Translucent fill for a band, applied to background-color rather than as an element opacity so that
   * the band's dashed edges stay at full strength. Fading the whole element would fade the edges too,
   * leaving a vertical band's boundaries far fainter than a horizontal one's, which keeps its opacity
   * on the rect's fill and its stroke opaque.
   */
  function getBandFill(color: string | undefined): string {
    return hexToRgba(color || DEFAULT_BAND_COLOR, GUIDE_BAND_OPACITY);
  }

  /** Cap fill: strong enough to read as the band's own edge, short of competing with the guide lines. */
  function getCapFill(color: string): string {
    return hexToRgba(color, 0.55);
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
        let date;
        if (histogramCursorTime) {
          unixEpochTime = histogramCursorTime.getTime();
          cursorX = xScaleView(unixEpochTime);
        } else {
          unixEpochTime = xScaleView.invert(offsetX).getTime();
          cursorX = offsetX;
        }
        date = new Date(unixEpochTime);
        cursorTimeLabel = formatDate(date, $plugins.time.primary.format);
        cursorTimeLabel += ' ' + $plugins.time.primary.label;
      }
      // Space available to the right (default) and to the left (when the label flips) of the
      // cursor line, within the drawable area. `cursorX` is still in draw coordinates here.
      cursorMaxWidth = drawWidth - cursorX;
      cursorMaxWidthFlipped = cursorX;
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
  <!-- Bands first so the guide markers and labels stay on top of their own shading -->
  {#each computedVerticalBands as band (band.id)}
    {@const bandColor = band.label.color || DEFAULT_BAND_COLOR}
    <div
      class="timeline-cursor-band"
      class:anchor-at-end={!band.anchorAtStart}
      style:background-color={getBandFill(bandColor)}
      style:border-left-color={band.showStartEdge ? bandColor : 'transparent'}
      style:border-right-color={band.showEndEdge ? bandColor : 'transparent'}
      style:transform="translateX({band.x}px)"
      style:width="{band.width}px"
    >
      <!-- The cap ties the two edges together into one object, and carries the readout an operator
           would otherwise have to get by subtracting the two dates in the editor. Cap and pill are
           siblings, and the cap is faded through its background color rather than through element
           opacity, so the pill it sits under stays at full strength. -->
      <div class="timeline-cursor-band-cap" style:background-color={getCapFill(bandColor)} />
      <span class="timeline-cursor-band-duration" style:background-color={bandColor}>{band.duration}</span>
    </div>
  {/each}
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
      label={cursorTimeLabel}
      maxWidth={cursorMaxWidth}
      maxWidthFlipped={cursorMaxWidthFlipped}
      flippable
      on:click={() => {
        if (xScaleView) {
          addVerticalGuide(getDoyTime(xScaleView.invert(offsetX)));
        }
      }}
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

  /* Spans every row, since the region it marks is a property of the timeline rather than of one row.
     pointer-events stay off (inherited from the container) so shading a region never costs the operator
     the ability to click through it.

     Solid on the edge the guide's own timestamp sits at, dashed on the edge its `timestamp2` extends
     to. That asymmetry is the only thing in the render that says which way the region runs, and it
     agrees with the editor row, which shows the anchor date and nothing else. */
  .timeline-cursor-band {
    border-left: 1px solid;
    border-right: 1px dashed;
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    transform: translateX(0);
  }

  /* An operator can type the two dates in either order; the band still runs the way they meant it, so
     the solid edge follows the anchor rather than staying on the left. */
  .timeline-cursor-band.anchor-at-end {
    border-left-style: dashed;
    border-right-style: solid;
  }

  .timeline-cursor-band-cap {
    height: 3px;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
  }

  /* Centered on the cap, and allowed to overflow a band narrower than itself rather than being clipped
     to illegibility -- a short region is exactly when the duration is worth reading. */
  .timeline-cursor-band-duration {
    border-radius: 8px;
    color: #fff;
    font-family: 'JetBrains mono', monospace;
    font-size: 9px;
    left: 50%;
    line-height: 1;
    padding: 2px 5px;
    position: absolute;
    top: 5px;
    transform: translateX(-50%);
    white-space: nowrap;
  }
</style>
