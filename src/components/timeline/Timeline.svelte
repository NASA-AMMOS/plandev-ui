<svelte:options immutable={true} />

<script lang="ts">
  import { afterUpdate, createEventDispatcher, tick } from 'svelte';
  import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
  import type {
    Activity,
    ConstraintViolation,
    MouseDown,
    MouseOver,
    MouseOverViolations,
    Resource,
    Row,
    StringTMap,
    TimeRange,
    VerticalGuide,
  } from '../../types';
  import { getDoyTime } from '../../utilities/time';
  import { getXScale } from '../../utilities/timeline';
  import TimelineRow from './Row.svelte';
  import Tooltip from './Tooltip.svelte';
  import TimelineXAxis from './XAxis.svelte';

  const dispatch = createEventDispatcher();

  export let activities: Activity[] = [];
  export let activitiesMap: StringTMap<Activity> = {};
  export let constraintViolations: ConstraintViolation[] = [];
  export let containerSize: number;
  export let id: number;
  export let marginLeft: number = 20;
  export let marginRight: number = 20;
  export let maxTimeRange: TimeRange | null = null;
  export let resources: Resource[] = [];
  export let rows: Row[] = [];
  export let selectedActivity: Activity | null = null;
  export let verticalGuides: VerticalGuide[] = [];
  export let viewTimeRange: TimeRange | null = null;

  let clientWidth: number = 0;
  let mouseOver: MouseOver;
  let mouseOverViolations: MouseOverViolations;
  let rowDragMoveDisabled = true;
  let rowsMaxHeight: number = 600;
  let timelineDiv: HTMLDivElement;
  let xAxisDiv: HTMLDivElement;
  let xAxisDrawHeight: number = 90;

  $: drawWidth = clientWidth > 0 ? clientWidth - marginLeft - marginRight : 0;
  $: setRowsMaxHeight(timelineDiv, xAxisDiv, containerSize);
  $: xDomainMax = [new Date(maxTimeRange.start), new Date(maxTimeRange.end)];
  $: xDomainView = [new Date(viewTimeRange.start), new Date(viewTimeRange.end)];
  $: xScaleMax = getXScale(xDomainMax, drawWidth);
  $: xScaleView = getXScale(xDomainView, drawWidth);
  $: xTicksView = xScaleView.ticks().map((date: Date) => {
    const doyTimestamp = getDoyTime(date, false);
    const [yearDay, time] = doyTimestamp.split('T');
    return { date, time, yearDay };
  });

  afterUpdate(() => {
    setRowsMaxHeight(timelineDiv, xAxisDiv, containerSize);
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
    dispatch('updateRows', { rows, timelineId: id });
  }

  function onMouseDown(event: CustomEvent<MouseDown>) {
    const { detail } = event;
    dispatch('mouseDown', { ...detail, timelineId: id });
  }

  function onMouseDownRowMove(event: Event) {
    event.preventDefault();
    rowDragMoveDisabled = false;
  }

  function onUpdateRowHeight(
    event: CustomEvent<{ newHeight: number; rowId: string }>,
  ) {
    const { newHeight, rowId } = event.detail;
    dispatch('updateRowHeight', { newHeight, rowId, timelineId: id });
  }

  async function setRowsMaxHeight(
    timelineDiv: HTMLDivElement,
    xAxisDiv: HTMLDivElement,
    containerSize: number | undefined,
  ) {
    if (timelineDiv && xAxisDiv && containerSize !== undefined) {
      await tick();
      const { clientHeight: parentHeight } = timelineDiv.parentElement;
      const offsetTop = xAxisDiv.clientHeight;
      const maxHeight = parentHeight - offsetTop;
      rowsMaxHeight = maxHeight;
    }
  }
</script>

<div
  bind:this={timelineDiv}
  bind:clientWidth
  class="timeline"
  id={`timeline-${id}`}
>
  <div bind:this={xAxisDiv} class="x-axis" style="height: {xAxisDrawHeight}px">
    <TimelineXAxis
      {constraintViolations}
      drawHeight={xAxisDrawHeight}
      {drawWidth}
      {marginLeft}
      {verticalGuides}
      {viewTimeRange}
      {xScaleMax}
      {xScaleView}
      {xTicksView}
      on:collapsedVerticalGuides
      on:resetViewTimeRange
      on:viewTimeRangeChanged
    />
  </div>
  <div
    class="rows"
    style="max-height: {rowsMaxHeight}px"
    on:consider={handleDndConsiderRows}
    on:finalize={handleDndFinalizeRows}
    use:dndzone={{
      dragDisabled: rowDragMoveDisabled,
      items: rows,
      type: 'rows',
    }}
  >
    {#each rows as row (row.id)}
      <TimelineRow
        {activities}
        {activitiesMap}
        autoAdjustHeight={row.autoAdjustHeight}
        {constraintViolations}
        drawHeight={row.height}
        {drawWidth}
        horizontalGuides={row.horizontalGuides}
        id={row.id}
        layers={row.layers}
        {marginLeft}
        {resources}
        {rowDragMoveDisabled}
        {selectedActivity}
        {verticalGuides}
        {viewTimeRange}
        {xScaleView}
        {xTicksView}
        yAxes={row.yAxes}
        on:dragActivity
        on:dragActivityEnd
        on:dropActivity
        on:mouseDown={onMouseDown}
        on:mouseDownRowMove={onMouseDownRowMove}
        on:mouseOver={e => (mouseOver = e.detail)}
        on:mouseOverViolations={e => (mouseOverViolations = e.detail)}
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
    overflow-x: hidden;
    overflow-y: scroll;
  }

  .timeline {
    height: 100%;
    overflow-x: hidden;
    overflow-y: hidden;
    width: 100%;
  }
</style>
