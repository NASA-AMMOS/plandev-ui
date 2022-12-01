<svelte:options immutable={true} />

<script lang="ts">
  import { afterUpdate, createEventDispatcher, tick } from 'svelte';
  import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
  import { clamp } from '../../utilities/generic';
  import { getDoy, getDoyTime } from '../../utilities/time';
  import {
    customD3Ticks,
    durationHour,
    durationMinute,
    durationMonth,
    durationYear,
    getXScale,
    MAX_CANVAS_SIZE,
  } from '../../utilities/timeline';
  import TimelineRow from './Row.svelte';
  import TimelineCursors from './TimelineCursors.svelte';
  import TimelineHistogram from './TimelineHistogram.svelte';
  import Tooltip from './Tooltip.svelte';
  import TimelineXAxis from './XAxis.svelte';

  export let activitiesByView: ActivitiesByView = { byLayerId: {}, byTimelineId: {} };
  export let constraintViolations: ConstraintViolation[] = [];
  export let gridId: number;
  export let maxTimeRange: TimeRange = { end: 0, start: 0 };
  export let resourcesByViewLayerId: Record<number, Resource[]> = {};
  export let selectedActivityId: ActivityUniqueId | null = null;
  export let timeline: Timeline | null = null;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };

  const dispatch = createEventDispatcher();

  let clientWidth: number = 0;
  let cursorEnabled: boolean = true;
  let cursorHeaderHeight: number = 0;
  let estimatedLabelWidthPx: number = 74; // Width of MS time which is the largest display format
  let histogramCursorTime: Date | null = null;
  let mouseOver: MouseOver;
  let mouseOverViolations: MouseOverViolations;
  let rowDragMoveDisabled = true;
  let rowsMaxHeight: number = 600;
  let rows: Row[] = [];
  let tickCount: number = 10;
  let timelineDiv: HTMLDivElement;
  let timelineHistogramDiv: HTMLDivElement;
  let timelineHistogramDrawHeight: number = 40;
  let xAxisDiv: HTMLDivElement;
  let xAxisDrawHeight: number = 64;
  let xTicksView: XAxisTick[] = [];

  $: rows = timeline?.rows || [];
  $: timeline.gridId = gridId;
  $: drawWidth = clientWidth > 0 ? clientWidth - timeline?.marginLeft - timeline?.marginRight : 0;

  // Compute number of ticks based off draw width
  $: if (drawWidth) {
    const padding = 1.5;
    let ticks = Math.round(drawWidth / (estimatedLabelWidthPx * padding));
    tickCount = clamp(ticks, 2, 16);
  }

  $: setRowsMaxHeight(timelineDiv, xAxisDiv, timelineHistogramDiv);
  $: xDomainMax = [new Date(maxTimeRange.start), new Date(maxTimeRange.end)];
  $: viewTimeRangeStartDate = new Date(viewTimeRange.start);
  $: viewTimeRangeEndDate = new Date(viewTimeRange.end);
  $: xDomainView = [viewTimeRangeStartDate, viewTimeRangeEndDate];
  $: xScaleMax = getXScale(xDomainMax, drawWidth);
  $: xScaleView = getXScale(xDomainView, drawWidth);
  $: xScaleViewDuration = viewTimeRange.end - viewTimeRange.start;

  $: if (viewTimeRangeStartDate && viewTimeRangeEndDate && tickCount) {
    let labelWidth = estimatedLabelWidthPx; // Compute the actual label width
    xTicksView = customD3Ticks(viewTimeRangeStartDate, viewTimeRangeEndDate, tickCount).map((date: Date) => {
      // Format fine and coarse time based off duration
      const doyTimestamp = getDoyTime(date, true);
      const splits = doyTimestamp.split('T');
      let coarseTime = splits[0];
      let fineTime = splits[1];
      if (xScaleViewDuration > durationYear * tickCount) {
        coarseTime = date.getFullYear().toString();
        fineTime = '';
        labelWidth = 29;
      } else if (xScaleViewDuration > durationMonth) {
        coarseTime = date.getFullYear().toString();
        fineTime = getDoy(date).toString();
        labelWidth = 29;
      } else if (xScaleViewDuration > durationHour) {
        fineTime = splits[1].slice(0, 5);
        labelWidth = 55;
      } else if (xScaleViewDuration > durationMinute) {
        fineTime = splits[1].slice(0, 8);
        labelWidth = 55;
      }
      return { coarseTime, date, fineTime, hideLabel: false };
    });

    // Determine whether or not to hide the last tick label
    // which has the potential to draw past the drawWidth
    if (xTicksView.length) {
      const lastTick = xTicksView[xTicksView.length - 1];
      if (xScaleView(lastTick.date) + labelWidth > drawWidth) {
        lastTick.hideLabel = true;
      }
    }
  }

  afterUpdate(() => {
    setRowsMaxHeight(timelineDiv, xAxisDiv, timelineHistogramDiv);
  });

  function handleDndConsiderRows(e: CustomEvent<DndEvent>) {
    const { detail } = e;
    const { info } = detail;
    const { trigger } = info;
    rows = detail.items as Row[];
    if (trigger === TRIGGERS.DRAG_STOPPED) {
      rowDragMoveDisabled = true;
    }
  }

  function handleDndFinalizeRows(e: CustomEvent<DndEvent>) {
    const { detail } = e;
    const { info } = detail;
    const { source } = info;
    rows = detail.items as Row[];
    if (source === SOURCES.POINTER) {
      rowDragMoveDisabled = true;
    }
    dispatch('updateRows', rows);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 't' && event.ctrlKey) {
      cursorEnabled = !cursorEnabled;
    }
  }

  function onMouseDown(event: CustomEvent<MouseDown>) {
    const { detail } = event;
    const { points } = detail;

    if (points.length) {
      const [point] = points; // TODO: Multiselect points?
      if (point.type === 'activity') {
        const activityPoint = point as ActivityPoint;
        dispatch('mouseDown', activityPoint.uniqueId);
      }
    }
  }

  function onMouseDownRowMove(event: Event) {
    event.preventDefault();
    rowDragMoveDisabled = false;
  }

  function onToggleRowExpansion(event: CustomEvent<{ expanded: boolean; rowId: number }>) {
    const { rowId, expanded } = event.detail;
    dispatch('toggleRowExpansion', { expanded, rowId });
  }

  function onUpdateRowHeight(event: CustomEvent<{ newHeight: number; rowId: number }>) {
    const { newHeight, rowId } = event.detail;
    if (timeline.gridId === gridId && newHeight < MAX_CANVAS_SIZE) {
      dispatch('updateRowHeight', { newHeight, rowId });
    }
  }

  function onHistogramViewTimeRangeChanged(event: CustomEvent<TimeRange>) {
    dispatch('viewTimeRangeChanged', event.detail);
    mouseOver = null;
  }

  function onHistogramCursorTimeChanged(event: CustomEvent<Date>) {
    histogramCursorTime = event.detail;
  }

  async function setRowsMaxHeight(
    timelineDiv: HTMLDivElement,
    xAxisDiv: HTMLDivElement,
    timelineHistogramDiv: HTMLDivElement,
  ) {
    await tick();
    if (timelineDiv && xAxisDiv && timelineDiv.parentElement) {
      const { clientHeight: parentHeight } = timelineDiv.parentElement;
      const offsetTop = xAxisDiv.clientHeight + timelineHistogramDiv.clientHeight;
      const maxHeight = parentHeight - offsetTop - cursorHeaderHeight;
      rowsMaxHeight = maxHeight;
    }
  }
</script>

<svelte:window on:keydown={onKeyDown} />

<div bind:this={timelineDiv} bind:clientWidth class="timeline" id={`timeline-${timeline?.id}`}>
  <div bind:this={timelineHistogramDiv} style="padding-top: 12px">
    <TimelineHistogram
      activities={activitiesByView?.byTimelineId[timeline.id] ?? []}
      {constraintViolations}
      {cursorEnabled}
      drawHeight={timelineHistogramDrawHeight}
      {drawWidth}
      marginLeft={timeline?.marginLeft}
      {mouseOver}
      {viewTimeRange}
      {xScaleView}
      {xScaleMax}
      on:cursorTimeChange={onHistogramCursorTimeChanged}
      on:viewTimeRangeChanged={onHistogramViewTimeRangeChanged}
    />
  </div>
  <div bind:this={xAxisDiv} class="x-axis" style="height: {xAxisDrawHeight}px">
    <TimelineXAxis
      {constraintViolations}
      drawHeight={xAxisDrawHeight}
      {drawWidth}
      marginLeft={timeline?.marginLeft}
      {viewTimeRange}
      {xScaleView}
      {xTicksView}
      on:viewTimeRangeChanged
    />
  </div>
  <TimelineCursors
    {cursorHeaderHeight}
    {cursorEnabled}
    {drawWidth}
    {histogramCursorTime}
    marginLeft={timeline?.marginLeft}
    {mouseOver}
    verticalGuides={timeline?.verticalGuides}
    {xScaleView}
    on:updateVerticalGuides
  />
  <div
    class="rows"
    style="max-height: {rowsMaxHeight}px"
    on:consider={handleDndConsiderRows}
    on:finalize={handleDndFinalizeRows}
    on:mouseenter={() => (timeline.gridId = gridId)}
    use:dndzone={{ dragDisabled: rowDragMoveDisabled, items: rows, type: 'rows' }}
  >
    {#each rows as row (row.id)}
      <TimelineRow
        {activitiesByView}
        autoAdjustHeight={row.autoAdjustHeight}
        {constraintViolations}
        drawHeight={row.height}
        {drawWidth}
        expanded={row.expanded}
        horizontalGuides={row.horizontalGuides}
        id={row.id}
        layers={row.layers}
        name={row.name}
        marginLeft={timeline?.marginLeft}
        {resourcesByViewLayerId}
        {rowDragMoveDisabled}
        {selectedActivityId}
        {viewTimeRange}
        {xScaleView}
        {xTicksView}
        yAxes={row.yAxes}
        on:mouseDown={onMouseDown}
        on:mouseDownRowMove={onMouseDownRowMove}
        on:mouseOver={e => (mouseOver = e.detail)}
        on:mouseOverViolations={e => (mouseOverViolations = e.detail)}
        on:toggleRowExpansion={onToggleRowExpansion}
        on:updateRowHeight={onUpdateRowHeight}
      />
    {/each}
  </div>

  <!-- Timeline Tooltip. -->
  <Tooltip {mouseOver} {mouseOverViolations} />
</div>

<style>
  .rows {
    min-height: 100px;
    outline: none !important;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .timeline {
    height: 100%;
    overflow-x: hidden;
    overflow-y: hidden;
    width: 100%;
  }

  .x-axis {
    pointer-events: none;
  }
</style>
