<svelte:options immutable={true} />

<script lang="ts">
  import { afterUpdate, tick } from 'svelte';
  import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
  import { getDoyTime } from '../../utilities/time';
  import { getXScale, MAX_CANVAS_SIZE } from '../../utilities/timeline';
  import TimelineRow from './Row.svelte';
  import Tooltip from './Tooltip.svelte';
  import TimelineXAxis from './XAxis.svelte';
  import {
    activities,
    activitiesMap,
    createActivity,
    selectActivity,
    selectedActivity,
    updateActivity,
  } from '../../stores/activities';
  import { violations } from '../../stores/constraints';
  import { plan, maxTimeRange, viewTimeRange } from '../../stores/plan';
  import { resources } from '../../stores/resources';
  import {
    setSelectedTimeline,
    updateRow,
    updateTimeline,
  } from '../../stores/views';
  import { selectedTimelinePanel } from '../../stores/panels';
  import { simulationStatus } from '../../stores/simulation';
  import { Status } from '../../utilities/enums';

  export let containerSize: number;
  export let id: number;
  export let marginLeft: number = 20;
  export let marginRight: number = 20;
  export let rows: Row[] = [];
  export let verticalGuides: VerticalGuide[] = [];

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
  $: xDomainMax = [new Date($maxTimeRange.start), new Date($maxTimeRange.end)];
  $: xDomainView = [
    new Date($viewTimeRange.start),
    new Date($viewTimeRange.end),
  ];
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
    updateTimeline('rows', rows, id);
  }

  function onDragActivity(event: CustomEvent<UpdateActivity>) {
    const { detail } = event;
    const { id, startTime } = detail;
    $activitiesMap[id] = { ...$activitiesMap[id], children: [], startTime };
    simulationStatus.update(Status.Dirty);
  }

  function onDragActivityEnd(event: CustomEvent<UpdateActivity>) {
    const { detail: activity } = event;
    updateActivity(activity, $plan.startTime);
  }

  function onDropActivity(event: CustomEvent<DropActivity>) {
    const { detail } = event;
    const { activityTypeName: type, startTime } = detail;
    const activity: CreateActivity = {
      arguments: {},
      startTime,
      type,
    };
    createActivity(activity, $plan.id, $plan.startTime);
    simulationStatus.update(Status.Dirty);
  }

  function onMouseDown(event: CustomEvent<MouseDown>) {
    const { detail } = event;
    const { layerId, points, rowId, yAxisId } = detail;

    if (points.length) {
      const [point] = points; // TODO: Multiselect points?
      if (point.type === 'activity') {
        selectActivity(point.id);
      }
    } else {
      setSelectedTimeline(id, rowId, layerId, yAxisId);
      selectedTimelinePanel.show();
    }
  }

  function onMouseDownRowMove(event: Event) {
    event.preventDefault();
    rowDragMoveDisabled = false;
  }

  function onResetViewTimeRange() {
    $viewTimeRange = $maxTimeRange;
  }

  function onUpdateRowHeight(
    event: CustomEvent<{ newHeight: number; rowId: number }>,
  ) {
    const { newHeight, rowId } = event.detail;
    if (newHeight < MAX_CANVAS_SIZE) {
      updateRow('height', newHeight, id, rowId);
    }
  }

  function onViewTimeRangeChanged(event: CustomEvent<TimeRange>) {
    $viewTimeRange = event.detail;
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
      constraintViolations={$violations}
      drawHeight={xAxisDrawHeight}
      {drawWidth}
      {marginLeft}
      {verticalGuides}
      viewTimeRange={$viewTimeRange}
      {xScaleMax}
      {xScaleView}
      {xTicksView}
      on:resetViewTimeRange={onResetViewTimeRange}
      on:viewTimeRangeChanged={onViewTimeRangeChanged}
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
        activities={$activities}
        activitiesMap={$activitiesMap}
        autoAdjustHeight={row.autoAdjustHeight}
        constraintViolations={$violations}
        drawHeight={row.height}
        {drawWidth}
        horizontalGuides={row.horizontalGuides}
        id={row.id}
        layers={row.layers}
        {marginLeft}
        resources={$resources}
        {rowDragMoveDisabled}
        selectedActivity={$selectedActivity}
        {verticalGuides}
        viewTimeRange={$viewTimeRange}
        {xScaleView}
        {xTicksView}
        yAxes={row.yAxes}
        on:dragActivity={onDragActivity}
        on:dragActivityEnd={onDragActivityEnd}
        on:dropActivity={onDropActivity}
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
