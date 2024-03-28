<svelte:options immutable={true} />

<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import { select, type Selection } from 'd3-selection';
  import { zoom as d3Zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
  import { pick } from 'lodash-es';
  import { createEventDispatcher } from 'svelte';
  import { Status } from '../../enums/status';
  import { catchError } from '../../stores/errors';
  import {
    externalResources,
    fetchingResourcesExternal,
    resourceTypes,
    resourceTypesLoading,
  } from '../../stores/simulation';
  import { selectedRow } from '../../stores/views';
  import type {
    ActivityDirective,
    ActivityDirectiveId,
    ActivityDirectivesByView,
    ActivityDirectivesMap,
  } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { ConstraintResultWithName } from '../../types/constraint';
  import type { Plan } from '../../types/plan';
  import type {
    Resource,
    ResourceRequest,
    SimulationDataset,
    Span,
    SpanId,
    SpansMap,
    SpanUtilityMaps,
  } from '../../types/simulation';
  import type {
    Axis,
    HorizontalGuide,
    Layer,
    MouseDown,
    MouseOver,
    Point,
    RowMouseOverEvent,
    TimeRange,
    XAxisTick,
  } from '../../types/timeline';
  import effects from '../../utilities/effects';
  import { classNames } from '../../utilities/generic';
  import { sampleProfiles } from '../../utilities/resources';
  import { getSimulationStatus } from '../../utilities/simulation';
  import { pluralize } from '../../utilities/text';
  import { getDoyTime } from '../../utilities/time';
  import {
    getYAxesWithScaleDomains,
    isXRangeLayer,
    TimelineInteractionMode,
    type TimelineLockStatus,
  } from '../../utilities/timeline';
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
  export let constraintResults: ConstraintResultWithName[] = [];
  export let decimate: boolean = false;
  export let interpolateHoverValue: boolean = false;
  export let limitTooltipToLine: boolean = false;
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

  const dispatch = createEventDispatcher<{
    mouseDown: MouseDown;
    mouseOver: MouseOver;
    updateRowHeight: {
      newHeight: number;
      rowId: number;
      wasAutoAdjusted?: boolean;
    };
    updateYAxes: {
      axes: Axis[];
      id: number;
    };
    zoom: D3ZoomEvent<HTMLCanvasElement, any>;
  }>();

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
  let mouseOverConstraintResults: ConstraintResultWithName[] = []; // For this row.
  let mouseOverPointsByLayer: Record<number, Point[]> = {};
  let mouseOverSpansByLayer: Record<number, Span[]> = {};
  let mouseOverGapsByLayer: Record<number, Point[]> = {};
  let overlaySvg: SVGElement;
  let yAxesWithScaleDomains: Axis[];
  let zoom: ZoomBehavior<SVGElement, unknown>;

  let resourceRequestMap: Record<string, ResourceRequest> = {};
  let loadedResources: Resource[];
  let loadingErrors: string[];
  let anyResourcesLoading: boolean = true;

  $: if (plan && simulationDataset !== null && layers && $externalResources && !$resourceTypesLoading) {
    const simulationDatasetId = simulationDataset.dataset_id;
    const resourceNamesSet = new Set<string>();
    layers.map(l => {
      if (l.chartType === 'line' || l.chartType === 'x-range') {
        l.filter.resource?.names.forEach(name => resourceNamesSet.add(name));
      }
    });
    const resourceNames = Array.from(resourceNamesSet);

    // Cancel and delete unused and stale requests as well as any external resources that
    // are not in the list of current external resources
    Object.entries(resourceRequestMap).forEach(([key, value]) => {
      if (
        resourceNames.indexOf(key) < 0 ||
        value.simulationDatasetId !== simulationDatasetId ||
        (value.type === 'external' && !$resourceTypes.find(type => type.name === name))
      ) {
        value.controller?.abort();
        delete resourceRequestMap[key];
        resourceRequestMap = { ...resourceRequestMap };
      }
    });

    // Only update if simulation is complete
    if (
      getSimulationStatus(simulationDataset) === Status.Complete ||
      getSimulationStatus(simulationDataset) === Status.Canceled
    ) {
      const startTimeYmd = simulationDataset?.simulation_start_time ?? plan.start_time;
      resourceNames.forEach(async name => {
        // Check if resource is external
        const isExternal = !$resourceTypes.find(t => t.name === name);
        if (isExternal) {
          // Handle external datasets separately as they are globally loaded and subscribed to
          let resource = null;
          if (!$fetchingResourcesExternal) {
            resource = $externalResources.find(resource => resource.name === name) || null;
          }
          let error = !resource && !$fetchingResourcesExternal ? 'External Profile not Found' : '';

          resourceRequestMap = {
            ...resourceRequestMap,
            [name]: {
              ...resourceRequestMap[name],
              error,
              loading: $fetchingResourcesExternal,
              resource,
              simulationDatasetId,
              type: 'external',
            },
          };
        } else {
          // Skip matching resources requests that have already been added for this simulation
          if (
            resourceRequestMap[name] &&
            simulationDatasetId === resourceRequestMap[name].simulationDatasetId &&
            (resourceRequestMap[name].loading || resourceRequestMap[name].error || resourceRequestMap[name].resource)
          ) {
            return;
          }

          const controller = new AbortController();
          resourceRequestMap = {
            ...resourceRequestMap,
            [name]: {
              ...resourceRequestMap[name],
              controller,
              error: '',
              loading: true,
              resource: null,
              simulationDatasetId,
              type: 'internal',
            },
          };

          let resource = null;
          let error = '';
          let aborted = false;
          try {
            const response = await effects.getResource(simulationDatasetId, name, user, controller.signal);
            const { profile } = response;
            if (profile && profile.length === 1) {
              resource = sampleProfiles([profile[0]], startTimeYmd)[0];
            } else {
              throw new Error('Profile not Found');
            }
          } catch (e) {
            const err = e as Error;
            if (err.name === 'AbortError') {
              aborted = true;
            } else {
              catchError(`Profile Download Failed for ${name}`, e as Error);
              error = err.message;
            }
          } finally {
            if (!aborted) {
              resourceRequestMap = {
                ...resourceRequestMap,
                [name]: {
                  ...resourceRequestMap[name],
                  error,
                  loading: false,
                  resource,
                },
              };
            }
          }
        }
      });
    }
  }

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
  $: hasResourceLayer = !!layers.find(layer => layer.chartType === 'line' || layer.chartType === 'x-range');

  // Track resource loading status for this Row
  $: if (resourceRequestMap) {
    const newLoadedResources: Resource[] = [];
    const newLoadingErrors: string[] = [];
    Object.values(resourceRequestMap).forEach(resourceRequest => {
      if (resourceRequest.resource) {
        newLoadedResources.push(resourceRequest.resource);
      }
      if (resourceRequest.error) {
        newLoadingErrors.push(resourceRequest.error);
      }
    });
    loadedResources = newLoadedResources;
    loadingErrors = newLoadingErrors;

    // Consider row to be loading if the number of completed resource requests (loaded or error state)
    // is not equal to the total number of resource requests
    anyResourcesLoading = loadedResources.length + loadingErrors.length !== Object.keys(resourceRequestMap).length;
  }

  // Compute scale domains for axes since it is optionally defined in the view
  $: if (loadedResources && yAxes) {
    yAxesWithScaleDomains = getYAxesWithScaleDomains(yAxes, layers, loadedResources, viewTimeRange);
    dispatch('updateYAxes', { axes: yAxesWithScaleDomains, id });
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

  function onMouseDown(event: CustomEvent<RowMouseOverEvent>) {
    const { detail } = event;
    const { layerId } = detail;

    if (layerId != null) {
      mouseDownActivityDirectivesByLayer[layerId] = detail?.activityDirectives ?? [];
      mouseDownSpansByLayer[layerId] = detail?.spans ?? [];

      const activityDirectives = Object.values(mouseDownActivityDirectivesByLayer).flat();
      const spans = Object.values(mouseDownSpansByLayer).flat();

      dispatch('mouseDown', { ...detail, activityDirectives, layerId, rowId: id, spans });
    }
  }

  function onMouseOver(event: CustomEvent<RowMouseOverEvent>) {
    const { detail } = event;
    const { layerId } = detail;

    if (layerId != null) {
      mouseOverActivityDirectivesByLayer[layerId] = detail?.activityDirectives ?? [];
      mouseOverConstraintResults = detail?.constraintResults ?? mouseOverConstraintResults;
      mouseOverPointsByLayer[layerId] = detail?.points ?? [];
      mouseOverSpansByLayer[layerId] = detail?.spans ?? [];
      mouseOverGapsByLayer[layerId] = detail?.gaps ?? mouseOverGapsByLayer[layerId] ?? [];

      dispatch('mouseOver', {
        ...detail,
        activityDirectivesByLayer: mouseOverActivityDirectivesByLayer,
        constraintResults: mouseOverConstraintResults,
        gapsByLayer: mouseOverGapsByLayer,
        pointsByLayer: mouseOverPointsByLayer,
        spansByLayer: mouseOverSpansByLayer,
      });
    }
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

  // Retrieve resources from resourceRequestMap by a layer's resource filter
  function getResourcesForLayer(layer: Layer, resourceRequestMap: Record<string, ResourceRequest> = {}) {
    if (!layer.filter.resource) {
      return [];
    }
    const resources: Resource[] = [];
    layer.filter.resource.names.forEach(name => {
      const resourceRequest = resourceRequestMap[name];
      if (resourceRequest && !resourceRequest.loading && !resourceRequest.error && resourceRequest.resource) {
        resources.push(resourceRequest.resource);
      }
    });
    return resources;
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
      resources={loadedResources}
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
      <!-- Loading indicator -->
      {#if hasResourceLayer && anyResourcesLoading}
        <div class="layer-message loading st-typography-label">Loading</div>
      {/if}
      <!-- Loading indicator -->
      {#if hasResourceLayer && loadingErrors.length}
        <div class="layer-message error st-typography-label">
          Failed to load profiles for {loadingErrors.length} layer{pluralize(loadingErrors.length)}
        </div>
      {/if}
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
              resources={getResourcesForLayer(layer, resourceRequestMap)}
              {xScaleView}
              on:mouseOver={onMouseOver}
            />
          {/if}
          {#if layer.chartType === 'line' || (isXRangeLayer(layer) && layer.showAsLinePlot)}
            <LayerLine
              {...layer}
              ordinalScale={isXRangeLayer(layer) && layer.showAsLinePlot}
              {decimate}
              {interpolateHoverValue}
              {limitTooltipToLine}
              {contextmenu}
              {dpr}
              drawHeight={computedDrawHeight}
              {drawWidth}
              filter={layer.filter.resource}
              {mousemove}
              {mouseout}
              resources={getResourcesForLayer(layer, resourceRequestMap)}
              {viewTimeRange}
              {xScaleView}
              yAxes={yAxesWithScaleDomains}
              on:mouseOver={onMouseOver}
              on:contextMenu
            />
          {/if}
          {#if isXRangeLayer(layer) && !layer.showAsLinePlot}
            <LayerXRange
              {...layer}
              {contextmenu}
              {dpr}
              drawHeight={computedDrawHeight}
              {drawWidth}
              filter={layer.filter.resource}
              {mousemove}
              {mouseout}
              resources={getResourcesForLayer(layer, resourceRequestMap)}
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

  .layer-message {
    align-items: center;
    display: flex;
    font-size: 10px;
    height: 100%;
    justify-content: center;
    pointer-events: none;
    position: absolute;
    width: 100%;
    z-index: 3;
  }

  .loading {
    animation: 1s delayVisibility;
    color: var(--st-gray-50);
  }

  .error {
    color: var(--st-red);
  }

  @keyframes delayVisibility {
    0% {
      visibility: hidden;
    }
    99% {
      visibility: hidden;
    }
    100% {
      visibility: visible;
    }
  }
</style>
