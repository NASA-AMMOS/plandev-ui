<svelte:options immutable={true} />

<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import { zoomIdentity, type D3ZoomEvent, type ZoomTransform } from 'd3-zoom';
  import { throttle } from 'lodash-es';
  import { afterUpdate, createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import { SOURCES, TRIGGERS, dndzone } from 'svelte-dnd-action';
  import { viewUpdateTimeline } from '../../stores/views';
  import type { ActivityDirectiveId, ActivityDirectivesByView, ActivityDirectivesMap } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { ConstraintResult } from '../../types/constraint';
  import type { Plan } from '../../types/plan';
  import type {
    Resource,
    Simulation,
    SimulationDataset,
    Span,
    SpanId,
    SpanUtilityMaps,
    SpansMap,
  } from '../../types/simulation';
  import type {
    DirectiveVisibilityToggleMap,
    MouseDown,
    MouseOver,
    Row,
    SpanVisibilityToggleMap,
    TimeRange,
    Timeline,
    XAxisTick,
  } from '../../types/timeline';
  import { clamp } from '../../utilities/generic';
  import { getDoyTime } from '../../utilities/time';
  import {
    MAX_CANVAS_SIZE,
    TimelineInteractionMode,
    TimelineLockStatus,
    customD3Ticks,
    durationMonth,
    durationWeek,
    durationYear,
    getXScale,
  } from '../../utilities/timeline';
  import TimelineRow from './Row.svelte';
  import RowHeaderDragHandleWidth from './RowHeaderDragHandleWidth.svelte';
  import TimelineContextMenu from './TimelineContextMenu.svelte';
  import TimelineCursors from './TimelineCursors.svelte';
  import TimelineHistogram from './TimelineHistogram.svelte';
  import TimelineSimulationRange from './TimelineSimulationRange.svelte';
  import TimelineTimeDisplay from './TimelineTimeDisplay.svelte';
  import Tooltip from './Tooltip.svelte';
  import TimelineXAxis from './XAxis.svelte';

  export let activityDirectivesByView: ActivityDirectivesByView = { byLayerId: {}, byTimelineId: {} };
  export let activityDirectivesMap: ActivityDirectivesMap = {};
  export let constraintResults: ConstraintResult[] = [];
  export let hasUpdateDirectivePermission: boolean = false;
  export let hasUpdateSimulationPermission: boolean = false;
  export let maxTimeRange: TimeRange = { end: 0, start: 0 };
  export let planEndTimeDoy: string;
  export let plan: Plan | null = null;
  export let planStartTimeYmd: string;
  export let resourcesByViewLayerId: Record<number, Resource[]> = {};
  export let selectedActivityDirectiveId: ActivityDirectiveId | null = null;
  export let selectedSpanId: SpanId | null = null;
  export let simulation: Simulation | null = null;
  export let simulationDataset: SimulationDataset | null = null;
  export let spanUtilityMaps: SpanUtilityMaps;
  export let spansMap: SpansMap = {};
  export let spans: Span[] = [];
  export let timeline: Timeline | null = null;
  export let timelineDirectiveVisibilityToggles: DirectiveVisibilityToggleMap = {};
  export let timelineInteractionMode: TimelineInteractionMode;
  export let timelineSpanVisibilityToggles: SpanVisibilityToggleMap = {};
  export let timelineLockStatus: TimelineLockStatus;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };
  export let user: User | null;

  const dispatch = createEventDispatcher();

  let timelineZoomTransform: ZoomTransform | null = null;
  let clientWidth: number = 0;
  let contextMenu: MouseOver | null;
  let contextMenuComponent: TimelineContextMenu;
  let dpr: number = 1;
  let tooltip: Tooltip;
  let cursorEnabled: boolean = true;
  let cursorHeaderHeight: number = 0;
  let estimatedLabelWidthPx: number = 130; // Width of MS time which is the largest display format
  let histogramCursorTime: Date | null = null;
  let mouseOver: MouseOver | null;
  let removeDPRChangeListener: (() => void) | null = null;
  let rowDragMoveDisabled = true;
  let rowsMaxHeight: number = 600;
  let rows: Row[] = [];
  let rowHeaderDragHandleWidthPx: number = 2;
  let tickCount: number = 10;
  let timelineDiv: HTMLDivElement;
  let timelineHistogramDiv: HTMLDivElement;
  let timelineHistogramDrawHeight: number = 40;
  let xAxisDiv: HTMLDivElement;
  let xAxisDrawHeight: number = 64;
  let xTicksView: XAxisTick[] = [];

  let throttledZoom = throttle(onZoom, 16, {
    leading: true,
    trailing: true,
  });

  let throttledHistogramViewTimeRangeChanged = throttle(onHistogramViewTimeRangeChanged, 16, {
    leading: true,
    trailing: true,
  });

  $: rows = timeline?.rows || [];
  $: drawWidth = clientWidth > 0 ? clientWidth - (timeline?.marginLeft ?? 0) - (timeline?.marginRight ?? 0) : 0;

  // Compute number of ticks based off draw width
  $: if (drawWidth) {
    const padding = 1.5;
    let ticks = Math.round(drawWidth / (estimatedLabelWidthPx * padding));
    tickCount = clamp(ticks, 2, 16);

    // Recompute zoom transform based off new drawWidth
    recomputeZoomTransform(viewTimeRange, drawWidth, xScaleMax);
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
      let formattedDateUTC = doyTimestamp;
      let formattedDateLocal = date.toLocaleString();
      if (xScaleViewDuration > durationYear * tickCount) {
        formattedDateUTC = doyTimestamp.slice(0, 4);
        formattedDateLocal = date.getFullYear().toString();
        labelWidth = 28;
      } else if (xScaleViewDuration > durationMonth * tickCount) {
        formattedDateUTC = doyTimestamp.slice(0, 8);
        formattedDateLocal = date.toLocaleDateString();
        labelWidth = 50;
      } else if (xScaleViewDuration > durationWeek) {
        formattedDateUTC = doyTimestamp.slice(0, 8);
        formattedDateLocal = date.toLocaleDateString();
        labelWidth = 58;
      }
      return { date, formattedDateLocal, formattedDateUTC, hideLabel: false };
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

  onDestroy(() => {
    if (removeDPRChangeListener !== null) {
      removeDPRChangeListener();
    }
  });

  onMount(() => {
    detectDPRChange();
  });

  function recomputeZoomTransform(
    viewTimeRange: TimeRange,
    drawWidth: number,
    xScaleMax: ScaleTime<number, number, never>,
  ) {
    const extent = [viewTimeRange.start, viewTimeRange.end];
    const transform = zoomIdentity
      // width of full domain relative to the view domain
      .scale(Math.max(1, drawWidth / (xScaleMax(extent[1]) - xScaleMax(extent[0]))))
      // Shift the transform to account for starting value
      .translate(-xScaleMax(extent[0]), 0);
    timelineZoomTransform = transform;
  }

  function detectDPRChange() {
    // Adapted from https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio#monitoring_screen_resolution_or_zoom_level_changes

    if (removeDPRChangeListener !== null) {
      removeDPRChangeListener();
    }

    // Create new change listener using current DPR
    const mqString = `(resolution: ${window.devicePixelRatio}dppx)`;
    const deviceMedia = matchMedia(mqString);
    deviceMedia.addEventListener('change', detectDPRChange);
    removeDPRChangeListener = () => deviceMedia.removeEventListener('change', detectDPRChange);

    dpr = window.devicePixelRatio;
  }

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

  function handleScroll(event: WheelEvent) {
    // Prevent default scroll behavior when meta key is pressed
    // as to not interfere with certain zoom scenarios
    if (event.metaKey || timelineInteractionMode === TimelineInteractionMode.Navigate) {
      event.preventDefault();
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 't' && event.ctrlKey) {
      cursorEnabled = !cursorEnabled;
    }
  }

  function onMouseDown(event: CustomEvent<MouseDown>) {
    dispatch('mouseDown', { ...event.detail, timelineId: timeline?.id });
  }

  function onMouseDownRowMove(event: Event) {
    event.preventDefault();
    rowDragMoveDisabled = false;
  }

  function onMouseUpRowMove(event: Event) {
    event.preventDefault();
    rowDragMoveDisabled = true;
  }

  function onToggleRowExpansion(event: CustomEvent<{ expanded: boolean; rowId: number }>) {
    const { rowId, expanded } = event.detail;
    dispatch('toggleRowExpansion', { expanded, rowId });
  }

  function onUpdateRowHeight(event: CustomEvent<{ newHeight: number; rowId: number; wasAutoAdjusted?: boolean }>) {
    const { newHeight, rowId, wasAutoAdjusted } = event.detail;
    if (newHeight < MAX_CANVAS_SIZE) {
      dispatch('updateRowHeight', { newHeight, rowId, wasAutoAdjusted });
    }
  }

  export function viewTimeRangeChanged(viewTimeRange: TimeRange, zoomTransform?: ZoomTransform) {
    dispatch('viewTimeRangeChanged', viewTimeRange);
    // Assign zoom transform if provided to syncronize all d3 zoom handlers
    if (zoomTransform) {
      timelineZoomTransform = zoomTransform;
    } else {
      // Otherwise compute the zoom transform based on the view extent
      recomputeZoomTransform(viewTimeRange, drawWidth, xScaleMax);
    }
  }

  async function onHistogramViewTimeRangeChanged(event: CustomEvent<TimeRange>) {
    await tick();
    viewTimeRangeChanged(event.detail);
    mouseOver = null;
    histogramCursorTime = null;
  }

  function onHistogramCursorTimeChanged(event: CustomEvent<Date>) {
    histogramCursorTime = event.detail;
  }

  function onUpdateRowHeaderWidth(event: CustomEvent<{ newWidth: number }>) {
    const { newWidth } = event.detail;
    viewUpdateTimeline('marginLeft', newWidth, timeline?.id);
    mouseOver = null;
    histogramCursorTime = null;
  }

  function onMoveRow(event: CustomEvent<{ direction: 'up' | 'down'; row: Row }>) {
    const {
      detail: { direction, row },
    } = event;
    const newRows = [...rows];
    const rowIndex = rows.findIndex(r => r.id === row.id);
    if (rowIndex < 0) {
      return;
    }
    if (direction === 'up') {
      if (rowIndex > 0) {
        const oldRow = newRows[rowIndex - 1];
        newRows[rowIndex - 1] = row;
        newRows[rowIndex] = oldRow;
      }
    } else if (direction === 'down') {
      if (rowIndex < rows.length - 1) {
        const oldRow = newRows[rowIndex + 1];
        newRows[rowIndex + 1] = row;
        newRows[rowIndex] = oldRow;
      }
    }
    dispatch('updateRows', newRows);
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

  function onContextMenu(e: CustomEvent, row: Row) {
    // Allow right clicking on interactive tippy tooltips on the canvas
    // in order to copy text within the tooltips
    const a = e.detail.e.target as HTMLElement;
    if (a && a.classList.value && a.classList.value.indexOf('tippy') > -1) {
      return;
    }
    contextMenu = { ...e.detail, row };
    tooltip.hide();
  }

  async function onZoom(e: CustomEvent<D3ZoomEvent<HTMLCanvasElement, any>>) {
    await tick();
    const newScale = e.detail.transform.rescaleX(xScaleMax).domain();
    let [start, end] = newScale;

    // Clear timeline and histogram cursor if this is a pan event
    const isPanEvent = e.detail.sourceEvent.type === 'mousemove';
    if (isPanEvent) {
      mouseOver = null;
      histogramCursorTime = null;
    }
    viewTimeRangeChanged({ end: end.getTime(), start: start.getTime() }, e.detail.transform);

    // Hide context menu and tooltip
    contextMenu = null;
    if (contextMenuComponent.isShown()) {
      contextMenuComponent.hide();
    }
    mouseOver = null;
    if (tooltip.isShown()) {
      tooltip.hide();
    }
  }
</script>

<svelte:window on:keydown={onKeyDown} />

<div bind:this={timelineDiv} bind:clientWidth class="timeline" id={`timeline-${timeline?.id}`}>
  <div bind:this={timelineHistogramDiv} class="timeline-time-row">
    <TimelineTimeDisplay
      planEndTimeDoy={plan?.end_time_doy}
      planStartTimeDoy={plan?.start_time_doy}
      width={timeline?.marginLeft}
    />
    <div class="timeline-histogram-container">
      <TimelineHistogram
        activityDirectives={timeline && activityDirectivesByView?.byTimelineId[timeline.id]
          ? activityDirectivesByView.byTimelineId[timeline.id]
          : []}
        {constraintResults}
        {cursorEnabled}
        drawHeight={timelineHistogramDrawHeight}
        {drawWidth}
        {mouseOver}
        {planStartTimeYmd}
        {simulationDataset}
        {spans}
        {timelineZoomTransform}
        {viewTimeRange}
        {xScaleView}
        {xScaleMax}
        on:cursorTimeChange={onHistogramCursorTimeChanged}
        on:viewTimeRangeChanged={throttledHistogramViewTimeRangeChanged}
        on:zoom={throttledZoom}
      />
    </div>
  </div>
  <div class="timeline-padded-content">
    <RowHeaderDragHandleWidth
      rowHeaderWidth={timeline?.marginLeft}
      on:updateRowHeaderWidth={onUpdateRowHeaderWidth}
      width={rowHeaderDragHandleWidthPx}
    />
    <div bind:this={xAxisDiv} style="height: {xAxisDrawHeight}px">
      <TimelineXAxis
        {constraintResults}
        drawHeight={xAxisDrawHeight}
        {drawWidth}
        marginLeft={timeline?.marginLeft ?? 0}
        {viewTimeRange}
        {xScaleView}
        {xTicksView}
        {timelineInteractionMode}
        {timelineZoomTransform}
        on:zoom={throttledZoom}
      />
    </div>
    <TimelineSimulationRange
      {cursorHeaderHeight}
      {drawWidth}
      marginLeft={timeline?.marginLeft}
      {simulationDataset}
      {xScaleView}
    />
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
      on:wheel={handleScroll}
      use:dndzone={{ dragDisabled: rowDragMoveDisabled, items: rows, type: 'rows' }}
    >
      {#each rows as row (row.id)}
        <div class="timeline-row-wrapper">
          <TimelineRow
            {activityDirectivesByView}
            {activityDirectivesMap}
            autoAdjustHeight={row.autoAdjustHeight}
            {constraintResults}
            {dpr}
            drawHeight={row.height}
            {drawWidth}
            expanded={row.expanded}
            {hasUpdateDirectivePermission}
            horizontalGuides={row.horizontalGuides}
            id={row.id}
            layers={row.layers}
            name={row.name}
            marginLeft={timeline?.marginLeft}
            {planEndTimeDoy}
            {plan}
            {planStartTimeYmd}
            {resourcesByViewLayerId}
            {rowDragMoveDisabled}
            {rowHeaderDragHandleWidthPx}
            {selectedActivityDirectiveId}
            {selectedSpanId}
            showDirectives={timelineDirectiveVisibilityToggles[row.id]}
            showSpans={timelineSpanVisibilityToggles[row.id]}
            {simulationDataset}
            {spanUtilityMaps}
            {spansMap}
            {timelineInteractionMode}
            {timelineLockStatus}
            {user}
            {viewTimeRange}
            {xScaleView}
            {xTicksView}
            yAxes={row.yAxes}
            {timelineZoomTransform}
            on:contextMenu={e => onContextMenu(e, row)}
            on:dblClick
            on:deleteActivityDirective
            on:mouseDown={onMouseDown}
            on:mouseDownRowMove={onMouseDownRowMove}
            on:mouseUpRowMove={onMouseUpRowMove}
            on:mouseOver={e => (mouseOver = e.detail)}
            on:toggleRowExpansion={onToggleRowExpansion}
            on:updateRowHeight={onUpdateRowHeight}
            on:zoom={throttledZoom}
          />
        </div>
      {/each}
    </div>
  </div>

  <!-- Timeline Tooltip. -->
  <Tooltip bind:this={tooltip} {mouseOver} />

  <!-- Timeline Context Menu. -->
  <TimelineContextMenu
    {activityDirectivesMap}
    bind:this={contextMenuComponent}
    {contextMenu}
    {hasUpdateDirectivePermission}
    {hasUpdateSimulationPermission}
    {maxTimeRange}
    on:deleteActivityDirective
    on:jumpToActivityDirective
    on:jumpToSpan
    on:hide={() => (contextMenu = null)}
    on:updateVerticalGuides
    on:viewTimeRangeReset={() => viewTimeRangeChanged(maxTimeRange)}
    on:viewTimeRangeChanged={event => viewTimeRangeChanged(event.detail)}
    {simulation}
    {simulationDataset}
    {spansMap}
    {spanUtilityMaps}
    {plan}
    {timelineDirectiveVisibilityToggles}
    {timelineSpanVisibilityToggles}
    {planStartTimeYmd}
    verticalGuides={timeline?.verticalGuides ?? []}
    {xScaleView}
    {user}
    on:toggleDirectiveVisibility
    on:toggleSpanVisibility
    on:editRow
    on:deleteRow
    on:moveRow={onMoveRow}
    on:duplicateRow
    on:insertRow
  />
</div>

<style>
  .rows {
    border-bottom: 1px solid var(--st-gray-15);
    min-height: 100px;
    outline: none !important;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .timeline {
    background-color: var(--st-gray-15);
    height: 100%;
    overflow-x: hidden;
    overflow-y: hidden;
    width: 100%;
  }

  .timeline-time-row {
    background: white;
    border-bottom: 1px solid var(--st-gray-20);
    display: flex;
  }

  .timeline-histogram-container {
    padding: 4px 8px 4px 0px;
  }

  .timeline-padded-content {
    background: white;
    border-radius: 4px;
  }

  :global(#dnd-action-dragged-el .row-root) {
    background: white;
    border: 1px solid var(--st-gray-40);
    box-shadow: var(--st-shadow-popover);
  }
</style>
