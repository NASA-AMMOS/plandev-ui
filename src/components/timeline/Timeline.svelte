<svelte:options immutable={true} />

<script lang="ts">
  import { afterUpdate, tick } from 'svelte';
  import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
  import { selectedActivityId } from '../../stores/activities';
  import { constraintViolations } from '../../stores/constraints';
  import { maxTimeRange, viewTimeRange } from '../../stores/plan';
  import { resources } from '../../stores/resources';
  import { view, viewUpdateRow, viewUpdateTimeline } from '../../stores/views';
  import { getDoyTime } from '../../utilities/time';
  import { getXScale, MAX_CANVAS_SIZE } from '../../utilities/timeline';
  import TimelineRow from './Row.svelte';
  import TimelineCursors from './TimelineCursors.svelte';
  import Tooltip from './Tooltip.svelte';
  import TimelineXAxis from './XAxis.svelte';

  export let gridId: number;
  export let timelineId: number;

  let clientWidth: number = 0;
  let cursorEnabled: boolean = true;
  let cursorHeaderHeight: number = 20;
  let mouseOver: MouseOver;
  let mouseOverViolations: MouseOverViolations;
  let rowDragMoveDisabled = true;
  let rowsMaxHeight: number = 600;
  let rows: Row[] = [];
  let timeline: Timeline;
  let timelineDiv: HTMLDivElement;
  let xAxisDiv: HTMLDivElement;
  let xAxisDrawHeight: number = 90;

  $: timeline = $view?.definition.plan.timelines.find(timeline => timeline.id === timelineId);
  $: rows = timeline?.rows || [];
  $: timeline.gridId = gridId;
  $: drawWidth = clientWidth > 0 ? clientWidth - timeline?.marginLeft - timeline?.marginRight : 0;
  $: setRowsMaxHeight(timelineDiv, xAxisDiv);
  $: xDomainMax = [new Date($maxTimeRange.start), new Date($maxTimeRange.end)];
  $: xDomainView = [new Date($viewTimeRange.start), new Date($viewTimeRange.end)];
  $: xScaleMax = getXScale(xDomainMax, drawWidth);
  $: xScaleView = getXScale(xDomainView, drawWidth);
  $: xTicksView = xScaleView.ticks().map((date: Date) => {
    const doyTimestamp = getDoyTime(date, false);
    const [yearDay, time] = doyTimestamp.split('T');
    return { date, time, yearDay };
  });

  afterUpdate(() => {
    setRowsMaxHeight(timelineDiv, xAxisDiv);
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
    viewUpdateTimeline('rows', rows, timelineId);
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
        $selectedActivityId = point.id;
      }
    }
  }

  function onMouseDownRowMove(event: Event) {
    event.preventDefault();
    rowDragMoveDisabled = false;
  }

  function onToggleRowExpansion(event: CustomEvent<{ expanded: boolean; rowId: number }>) {
    const { rowId, expanded } = event.detail;
    viewUpdateRow('expanded', expanded, timelineId, rowId);
  }

  function onUpdateRowHeight(event: CustomEvent<{ newHeight: number; rowId: number }>) {
    const { newHeight, rowId } = event.detail;
    if (timeline.gridId === gridId && newHeight < MAX_CANVAS_SIZE) {
      viewUpdateRow('height', newHeight, timelineId, rowId);
    }
  }

  function onViewTimeRangeChanged(event: CustomEvent<TimeRange>) {
    $viewTimeRange = event.detail;
  }

  async function setRowsMaxHeight(timelineDiv: HTMLDivElement, xAxisDiv: HTMLDivElement) {
    await tick();
    if (timelineDiv && xAxisDiv && timelineDiv.parentElement) {
      const { clientHeight: parentHeight } = timelineDiv.parentElement;
      const offsetTop = xAxisDiv.clientHeight;
      const maxHeight = parentHeight - offsetTop - cursorHeaderHeight;
      rowsMaxHeight = maxHeight;
    }
  }
</script>

<svelte:window on:keydown={onKeyDown} />

<div bind:this={timelineDiv} bind:clientWidth class="timeline" id={`timeline-${timelineId}`}>
  <div bind:this={xAxisDiv} class="x-axis" style="height: {xAxisDrawHeight}px">
    <TimelineXAxis
      constraintViolations={$constraintViolations}
      drawHeight={xAxisDrawHeight}
      {drawWidth}
      marginLeft={timeline?.marginLeft}
      verticalGuides={timeline?.verticalGuides}
      viewTimeRange={$viewTimeRange}
      {xScaleMax}
      {xScaleView}
      {xTicksView}
      on:viewTimeRangeChanged={onViewTimeRangeChanged}
    />
  </div>
  <TimelineCursors
    {mouseOver}
    {xScaleView}
    {drawWidth}
    {cursorHeaderHeight}
    {cursorEnabled}
    marginLeft={timeline?.marginLeft}
  />
  <div
    class="rows"
    style="max-height: {rowsMaxHeight}px"
    on:consider={handleDndConsiderRows}
    on:finalize={handleDndFinalizeRows}
    on:mouseenter={() => (timeline.gridId = gridId)}
    use:dndzone={{
      dragDisabled: rowDragMoveDisabled,
      items: rows,
      type: 'rows',
    }}
  >
    {#each rows as row (row.id)}
      <TimelineRow
        autoAdjustHeight={row.autoAdjustHeight}
        constraintViolations={$constraintViolations}
        drawHeight={row.height}
        {drawWidth}
        expanded={row.expanded}
        horizontalGuides={row.horizontalGuides}
        id={row.id}
        layers={row.layers}
        name={row.name}
        marginLeft={timeline?.marginLeft}
        resources={$resources}
        {rowDragMoveDisabled}
        verticalGuides={timeline?.verticalGuides}
        viewTimeRange={$viewTimeRange}
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
</style>
