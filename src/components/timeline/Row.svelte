<svelte:options immutable={true} />

<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import { select, type Selection } from 'd3-selection';
  import { zoom as d3Zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
  import { pick } from 'lodash-es';
  import { createEventDispatcher } from 'svelte';
  import { allResources } from '../../stores/simulation';
  import { selectedRow } from '../../stores/views';
  import type {
    ActivityDirective,
    ActivityDirectiveId,
    ActivityDirectivesByView,
    ActivityDirectivesMap,
  } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { ConstraintResult } from '../../types/constraint';
  import type { Plan } from '../../types/plan';
  import type { Resource, SimulationDataset, Span, SpanId, SpansMap, SpanUtilityMaps } from '../../types/simulation';
  import type {
    Axis,
    HorizontalGuide,
    Layer,
    MouseDown,
    MouseOver,
    Point,
    TimeRange,
    XAxisTick,
  } from '../../types/timeline';
  import effects from '../../utilities/effects';
  import { classNames } from '../../utilities/generic';
  import { getDoyTime } from '../../utilities/time';
  import { getYAxesWithScaleDomains, TimelineInteractionMode, type TimelineLockStatus } from '../../utilities/timeline';
  import ConstraintViolations from './ConstraintViolations.svelte';
  import LayerActivity from './LayerActivity.svelte';
  import LayerGaps from './LayerGaps.svelte';
  import LayerLine from './LayerLine.svelte';
  import LayerXRange from './LayerXRange.svelte';
  import RowDragHandleHeight from './RowDragHandleHeight.svelte';
  import RowHeader from './RowHeader.svelte';
  import RowHorizontalGuides from './RowHorizontalGuides.svelte';
  import RowXAxisTicks from './RowXAxisTicks.svelte';
  import RowYAxisTicks from './RowYAxisTicks.svelte';

  export let activityDirectivesByView: ActivityDirectivesByView = { byLayerId: {}, byTimelineId: {} };
  export let activityDirectivesMap: ActivityDirectivesMap = {};
  export let autoAdjustHeight: boolean = false;
  export let constraintResults: ConstraintResult[] = [];
  export let dpr: number = 0;
  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let expanded: boolean = true;
  export let hasUpdateDirectivePermission: boolean = false;
  export let horizontalGuides: HorizontalGuide[] = [];
  export let id: number;
  export let layers: Layer[] = [];
  export let name: string = '';
  export let marginLeft: number = 50;
  export let planEndTimeDoy: string;
  export let plan: Plan | null = null;
  export let planStartTimeYmd: string;
  export let resourcesByViewLayerId: Record<number, Resource[]> = {};
  export let rowDragMoveDisabled = true;
  export let rowHeaderDragHandleWidthPx: number = 2;
  export let selectedActivityDirectiveId: ActivityDirectiveId | null = null;
  export let selectedSpanId: SpanId | null = null;
  export let showDirectives: boolean = true;
  export let showSpans: boolean = true;
  export let simulationDataset: SimulationDataset | null = null;
  export let spanUtilityMaps: SpanUtilityMaps;
  export let spansMap: SpansMap = {};
  export let timelineInteractionMode: TimelineInteractionMode;
  export let timelineLockStatus: TimelineLockStatus;
  export let timelineZoomTransform: ZoomTransform | null;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let xTicksView: XAxisTick[] = [];
  export let yAxes: Axis[] = [];
  export let user: User | null;

  const dispatch = createEventDispatcher();

  let blur: FocusEvent;
  let contextmenu: MouseEvent;
  let dblclick: MouseEvent;
  let dragenter: DragEvent;
  let dragleave: DragEvent;
  let dragover: DragEvent;
  let drop: DragEvent;
  let focus: FocusEvent;
  let heightsByLayer: Record<number, number> = {};
  let mousedown: MouseEvent;
  let mousemove: MouseEvent;
  let mouseout: MouseEvent;
  let mouseup: MouseEvent;
  let mouseDownActivityDirectivesByLayer: Record<number, ActivityDirective[]> = {};
  let mouseDownSpansByLayer: Record<number, Span[]> = {};
  let mouseOverActivityDirectivesByLayer: Record<number, ActivityDirective[]> = {};
  let mouseOverConstraintResults: ConstraintResult[] = []; // For this row.
  let mouseOverPointsByLayer: Record<number, Point[]> = {};
  let mouseOverSpansByLayer: Record<number, Span[]> = {};
  let mouseOverGapsByLayer: Record<number, Point[]> = {};
  let overlaySvg: SVGElement;
  let yAxesWithScaleDomains: Axis[];
  let zoom: ZoomBehavior<SVGElement, unknown>;

  $: onDragenter(dragenter);
  $: onDragleave(dragleave);
  $: onDragover(dragover);
  $: onDrop(drop);
  $: computedDrawHeight = expanded ? drawHeight : 24;

  $: heightsByLayer = pick(
    heightsByLayer,
    layers.map(({ id }) => id),
  );
  $: overlaySvgSelection = select(overlaySvg) as Selection<SVGElement, unknown, any, any>;
  $: rowClasses = classNames('row', { 'row-collapsed': !expanded });
  $: hasActivityLayer = !!layers.find(layer => layer.chartType === 'activity');

  // Compute scale domains for axes since it is optionally defined in the view
  $: if ($allResources && yAxes) {
    yAxesWithScaleDomains = getYAxesWithScaleDomains(yAxes, layers, resourcesByViewLayerId, viewTimeRange);
  }

  $: if (overlaySvgSelection && drawWidth) {
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
    overlaySvgSelection.call(zoom.transform, timelineZoomTransform || zoomIdentity);
    overlaySvgSelection.call(zoom);
  }

  $: if (timelineZoomTransform && overlaySvgSelection) {
    // Set transform if it has changed (from other rows or elsewhere), causes zoomed event to fire
    overlaySvgSelection.call(zoom.transform, timelineZoomTransform);
  }

  function zoomed(e: D3ZoomEvent<HTMLCanvasElement, any>) {
    // Prevent dispatch when zoom did not originate from this row (i.e. propagated from zoomTransform)
    if (e.transform && timelineZoomTransform && e.transform.toString() === timelineZoomTransform.toString()) {
      return;
    }
    dispatch('zoom', e);
  }

  function onDragenter(e: DragEvent | undefined): void {
    if (hasActivityLayer && e && overlaySvgSelection) {
      const { offsetX } = e;
      overlaySvgSelection
        .append('line')
        .attr('class', 'activity-drag-guide')
        .attr('x1', offsetX)
        .attr('y1', 0)
        .attr('x2', offsetX)
        .attr('y2', computedDrawHeight)
        .attr('stroke', 'black')
        .style('pointer-events', 'none');
    }
  }

  function onDragleave(e: DragEvent | undefined): void {
    if (hasActivityLayer && e && overlaySvgSelection) {
      overlaySvgSelection.select('.activity-drag-guide').remove();
    }
  }

  function onDragover(e: DragEvent | undefined): void {
    if (hasActivityLayer && e && overlaySvgSelection) {
      const { offsetX } = e;
      overlaySvgSelection.select('.activity-drag-guide').attr('x1', offsetX).attr('x2', offsetX);
    }
  }

  function onDrop(e: DragEvent | undefined): void {
    if (hasActivityLayer && e && overlaySvgSelection && xScaleView !== null) {
      const { offsetX } = e;
      overlaySvgSelection.select('.activity-drag-guide').remove();
      if (e.dataTransfer !== null) {
        const unixEpochTime = xScaleView.invert(offsetX).getTime();
        const start_time = getDoyTime(new Date(unixEpochTime));
        const activityTypeName = e.dataTransfer.getData('activityTypeName');

        // Only allow creating an activity if we have an actual activity in the drag data.
        if (activityTypeName && plan) {
          effects.createActivityDirective({}, start_time, activityTypeName, activityTypeName, {}, plan, user);
        }
      }
    }
  }

  function onMouseDown(event: CustomEvent<MouseDown>) {
    const { detail } = event;
    const { layerId } = detail;

    mouseDownActivityDirectivesByLayer[layerId] = detail?.activityDirectives ?? [];
    mouseDownSpansByLayer[layerId] = detail?.spans ?? [];

    const activityDirectives = Object.values(mouseDownActivityDirectivesByLayer).flat();
    const spans = Object.values(mouseDownSpansByLayer).flat();

    dispatch('mouseDown', { ...detail, activityDirectives, rowId: id, spans });
  }

  function onMouseOver(event: CustomEvent<MouseOver>) {
    const { detail } = event;
    const { layerId } = detail;

    mouseOverActivityDirectivesByLayer[layerId] = detail?.activityDirectives ?? [];
    mouseOverConstraintResults = detail?.constraintResults ?? mouseOverConstraintResults;
    mouseOverPointsByLayer[layerId] = detail?.points ?? [];
    mouseOverSpansByLayer[layerId] = detail?.spans ?? [];
    mouseOverGapsByLayer[layerId] = detail?.gaps ?? mouseOverGapsByLayer[layerId] ?? [];

    const activityDirectives = Object.values(mouseOverActivityDirectivesByLayer).flat();
    const constraintResults = mouseOverConstraintResults;
    const points = Object.values(mouseOverPointsByLayer).flat();
    const spans = Object.values(mouseOverSpansByLayer).flat();
    const gaps = Object.values(mouseOverGapsByLayer).flat();

    dispatch('mouseOver', { ...detail, activityDirectives, constraintResults, gaps, points, spans });
  }

  function onUpdateRowHeightDrag(event: CustomEvent<{ newHeight: number }>) {
    const { newHeight } = event.detail;
    dispatch('updateRowHeight', { newHeight, rowId: id });
  }

  function onUpdateRowHeightLayer(event: CustomEvent<{ layerId: number; newHeight: number }>) {
    if (autoAdjustHeight) {
      const { detail } = event;
      heightsByLayer[detail.layerId] = detail.newHeight;
      const heights = Object.values(heightsByLayer);
      const newHeight = Math.max(...heights);

      // Only update row height if a change has occurred to avoid loopback
      if (newHeight !== computedDrawHeight) {
        dispatch('updateRowHeight', { newHeight, rowId: id, wasAutoAdjusted: true });
      }
    }
  }
</script>

<div
  class="row-root"
  class:active-row={$selectedRow ? $selectedRow.id === id : false}
  class:expanded
  class:auto-height={autoAdjustHeight}
>
  <div class="row-content">
    <!-- Row Header. -->
    <RowHeader
      width={marginLeft}
      height={computedDrawHeight}
      {expanded}
      rowId={id}
      title={name}
      {rowDragMoveDisabled}
      {layers}
      {resourcesByViewLayerId}
      yAxes={yAxesWithScaleDomains}
      {rowHeaderDragHandleWidthPx}
      on:mouseDownRowMove
      on:mouseUpRowMove
      on:toggleRowExpansion
      on:contextMenu
    />

    <div
      class={rowClasses}
      id={`row-${id}`}
      style={`cursor: ${
        timelineInteractionMode === TimelineInteractionMode.Navigate ? 'move' : ''
      }; height: ${computedDrawHeight}px;`}
    >
      <!-- Overlay for Pointer Events. -->
      <svg
        bind:this={overlaySvg}
        class="overlay"
        role="none"
        style="width: {drawWidth}px"
        on:blur={e => (blur = e)}
        on:contextmenu={e => (contextmenu = e)}
        on:dragenter|preventDefault={e => (dragenter = e)}
        on:dragleave={e => (dragleave = e)}
        on:dragover|preventDefault={e => (dragover = e)}
        on:drop|preventDefault={e => (drop = e)}
        on:focus={e => (focus = e)}
        on:mousedown={e => (mousedown = e)}
        on:mousemove={e => (mousemove = e)}
        on:mouseout={e => (mouseout = e)}
        on:mouseup={e => (mouseup = e)}
        on:dblclick={e => (dblclick = e)}
      />

      <!-- SVG Elements. -->
      <svg>
        <g>
          {#if drawWidth > 0}
            <RowXAxisTicks drawHeight={computedDrawHeight} {xScaleView} {xTicksView} />
            {#if expanded}
              <RowYAxisTicks drawHeight={computedDrawHeight} {drawWidth} yAxes={yAxesWithScaleDomains} {layers} />
            {/if}
            <ConstraintViolations
              {constraintResults}
              drawHeight={computedDrawHeight}
              {drawWidth}
              {mousemove}
              {mouseout}
              {viewTimeRange}
              {xScaleView}
              on:mouseOver={onMouseOver}
            />
            <RowHorizontalGuides
              drawHeight={computedDrawHeight}
              {drawWidth}
              {horizontalGuides}
              yAxes={yAxesWithScaleDomains}
            />
          {/if}
        </g>
      </svg>
      <!-- Layers of Canvas Visualizations. -->
      <div class="layers" style="width: {drawWidth}px">
        {#each layers as layer (layer.id)}
          {#if layer.chartType === 'activity'}
            <LayerActivity
              {...layer}
              activityDirectives={activityDirectivesByView?.byLayerId[layer.id] ?? []}
              {activityDirectivesMap}
              {hasUpdateDirectivePermission}
              {showDirectives}
              {showSpans}
              {blur}
              {contextmenu}
              {dpr}
              drawHeight={computedDrawHeight}
              {drawWidth}
              filter={layer.filter.activity}
              {focus}
              {dblclick}
              {mousedown}
              {mousemove}
              {mouseout}
              {mouseup}
              mode={expanded ? 'packed' : 'heatmap'}
              {planEndTimeDoy}
              {plan}
              {planStartTimeYmd}
              {selectedActivityDirectiveId}
              {selectedSpanId}
              {simulationDataset}
              {spanUtilityMaps}
              {spansMap}
              {timelineInteractionMode}
              {timelineLockStatus}
              {user}
              {viewTimeRange}
              {xScaleView}
              on:contextMenu
              on:deleteActivityDirective
              on:dblClick
              on:mouseDown={onMouseDown}
              on:mouseOver={onMouseOver}
              on:updateRowHeight={onUpdateRowHeightLayer}
            />
          {/if}
          {#if layer.chartType === 'line' || layer.chartType === 'x-range'}
            <LayerGaps
              {...layer}
              {dpr}
              drawHeight={computedDrawHeight}
              {drawWidth}
              filter={layer.filter.resource}
              {mousemove}
              {mouseout}
              resources={resourcesByViewLayerId[layer.id] ?? []}
              {xScaleView}
              on:mouseOver={onMouseOver}
            />
          {/if}
          {#if layer.chartType === 'line'}
            <LayerLine
              {...layer}
              {contextmenu}
              {dpr}
              drawHeight={computedDrawHeight}
              {drawWidth}
              filter={layer.filter.resource}
              {mousemove}
              {mouseout}
              resources={resourcesByViewLayerId[layer.id] ?? []}
              {viewTimeRange}
              {xScaleView}
              yAxes={yAxesWithScaleDomains}
              on:mouseOver={onMouseOver}
              on:contextMenu
            />
          {/if}
          {#if layer.chartType === 'x-range'}
            <LayerXRange
              {...layer}
              {contextmenu}
              {dpr}
              drawHeight={computedDrawHeight}
              {drawWidth}
              filter={layer.filter.resource}
              {mousemove}
              {mouseout}
              resources={resourcesByViewLayerId[layer.id] ?? []}
              {xScaleView}
              on:mouseOver={onMouseOver}
              on:contextMenu
            />
          {/if}
        {/each}
      </div>
    </div>
  </div>

  <!-- Drag Handle for Row Height Resizing. -->
  {#if !autoAdjustHeight && expanded}
    <RowDragHandleHeight rowHeight={drawHeight} on:updateRowHeight={onUpdateRowHeightDrag} />
  {/if}
</div>

<style>
  .layers,
  .overlay,
  svg {
    height: inherit;
    position: absolute;
  }

  .layers {
    pointer-events: none;
    z-index: 3;
  }

  .overlay {
    outline: none;
    z-index: 2;
  }

  svg {
    width: 100%;
    z-index: 1;
  }

  .row {
    cursor: pointer;
    display: block;
    position: relative;
    width: 100%;
    z-index: 1;
  }

  :global(.row-root:hover .row-header .row-drag-handle-container) {
    opacity: 1;
  }

  .row-root .row-controls {
    display: flex;
  }

  :global(.right) {
    z-index: 0;
  }

  .row-edit-button {
    display: flex;
  }

  :global(.row-edit-button.st-button.icon svg) {
    color: var(--st-gray-50);
  }

  :global(.row-edit-button.st-button.icon:hover svg) {
    color: var(--st-gray-70);
  }

  .row-root {
    border-bottom: 2px solid var(--st-gray-20);
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .row-root.expanded:not(.auto-height) {
    border-bottom: none;
  }

  .row-content {
    display: flex;
    position: relative;
  }

  .active-row .row-content:after {
    box-shadow: 0 0 0px 1px inset var(--st-utility-blue);
    content: ' ';
    height: 100%;
    left: 0;
    pointer-events: none;
    position: absolute;
    top: 0;
    width: 100%;
    z-index: 9;
  }

  .active-row .row-content {
    background: rgba(47, 128, 237, 0.06);
  }
  .active-row :global(.row-header) {
    background: rgba(47, 128, 237, 0.06);
  }
</style>
