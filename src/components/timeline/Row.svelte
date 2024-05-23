<svelte:options immutable={true} />

<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import { select, type Selection } from 'd3-selection';
  import { zoom as d3Zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
  import { groupBy } from 'lodash-es';
  import { createEventDispatcher } from 'svelte';
  import FilterWithXIcon from '../../assets/filter-with-x.svg?component';
  import { ViewDefaultActivityOptions } from '../../constants/view';
  import { Status } from '../../enums/status';
  import { catchError } from '../../stores/errors';
  import {
    externalResources,
    fetchingResourcesExternal,
    resourceTypes,
    resourceTypesLoading,
  } from '../../stores/simulation';
  import { selectedRow } from '../../stores/views';
  import type { ActivityDirective, ActivityDirectiveId, ActivityDirectivesMap } from '../../types/activity';
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
    ActivityOptions,
    ActivityTree,
    ActivityTreeExpansionMap,
    ActivityTreeNode,
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
    directiveInView,
    generateActivityTree as generateActivityTreeUtil,
    getYAxesWithScaleDomains,
    isActivityLayer,
    isLineLayer,
    isXRangeLayer,
    spanInView,
    TimelineInteractionMode,
    type TimelineLockStatus,
  } from '../../utilities/timeline';
  import { tooltip } from '../../utilities/tooltip';
  import ConstraintViolations from './ConstraintViolations.svelte';
  import LayerActivities from './LayerActivities.svelte';
  import LayerGaps from './LayerGaps.svelte';
  import LayerLine from './LayerLine.svelte';
  import LayerXRange from './LayerXRange.svelte';
  import RowDragHandleHeight from './RowDragHandleHeight.svelte';
  import RowHeader from './RowHeader.svelte';
  import RowHorizontalGuides from './RowHorizontalGuides.svelte';
  import RowXAxisTicks from './RowXAxisTicks.svelte';
  import RowYAxisTicks from './RowYAxisTicks.svelte';

  export let activityDirectives: ActivityDirective[] = [];
  export let activityDirectivesMap: ActivityDirectivesMap = {};
  export let activityTreeExpansionMap: ActivityTreeExpansionMap | undefined = {};
  export let activityOptions: ActivityOptions | undefined = undefined;
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
    activityTreeExpansionChange: ActivityTreeExpansionMap;
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
  let mousedown: MouseEvent;
  let mousemove: MouseEvent;
  let mouseout: MouseEvent;
  let mouseup: MouseEvent;
  let mouseOverActivityDirectives: ActivityDirective[] = [];
  let mouseOverConstraintResults: ConstraintResultWithName[] = []; // For this row.
  let mouseOverPointsByLayer: Record<number, Point[]> = {};
  let mouseOverSpans: Span[] = [];
  let mouseOverGapsByLayer: Record<number, Point[]> = {};
  let overlaySvg: SVGElement;
  let yAxesWithScaleDomains: Axis[];
  let zoom: ZoomBehavior<SVGElement, unknown>;

  let resourceRequestMap: Record<string, ResourceRequest> = {};
  let loadedResources: Resource[];
  let loadingErrors: string[];
  let anyResourcesLoading: boolean = true;
  let activityTree: ActivityTree = [];
  let filteredActivityDirectives: ActivityDirective[] = [];
  let filteredSpans: Span[] = [];
  let timeFilteredActivityDirectives: ActivityDirective[] = [];
  let timeFilteredSpans: Span[] = [];
  let idToColorMaps: { directives: Record<number, string>; spans: Record<number, string> } = {
    directives: {},
    spans: {},
  };
  let filterActivitiesByTime = false;

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
  $: overlaySvgSelection = select(overlaySvg) as Selection<SVGElement, unknown, any, any>;
  $: rowClasses = classNames('row', { 'row-collapsed': !expanded });
  $: activityOptions = activityOptions || { ...ViewDefaultActivityOptions };
  $: activityLayers = layers.filter(isActivityLayer);
  $: lineLayers = layers.filter(l => isLineLayer(l) || (isXRangeLayer(l) && l.showAsLinePlot));
  $: xRangeLayers = layers.filter(l => isXRangeLayer(l) && !l.showAsLinePlot);
  $: hasActivityLayer = activityLayers.length > 0;
  $: hasResourceLayer = lineLayers.length + xRangeLayers.length > 0;
  $: showSpans = activityOptions?.composition === 'both' || activityOptions?.composition === 'spans';
  $: showDirectives = activityOptions?.composition === 'both' || activityOptions?.composition === 'directives';

  $: if (activityTreeExpansionMap === undefined) {
    activityTreeExpansionMap = {};
  }

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

  $: if (activityLayers && spansMap && activityDirectives && typeof filterActivitiesByTime === 'boolean') {
    activityTree = [];
    idToColorMaps = { directives: {}, spans: {} };

    let spansList = Object.values(spansMap);
    const directivesByType = groupBy(activityDirectives, 'type');
    const spansByType = groupBy(spansList, 'type');
    if (activityLayers.length) {
      let directives: ActivityDirective[] = [];
      let spans: Span[] = [];

      // track directives and spans that have been seen to avoid double counting
      // if more than one layer matches a type
      let seenDirectiveIds: Record<number, boolean> = {};
      let seenSpanIds: Record<number, boolean> = {};
      activityLayers.forEach(layer => {
        if (layer.filter && layer.filter.activity !== undefined) {
          const types = layer.filter.activity.types || [];
          types.forEach(type => {
            const matchingDirectives = directivesByType[type];
            if (matchingDirectives) {
              const uniqueDirectives: ActivityDirective[] = [];
              matchingDirectives.forEach(directive => {
                if (!seenDirectiveIds[directive.id]) {
                  idToColorMaps.directives[directive.id] = layer.activityColor;
                  seenDirectiveIds[directive.id] = true;
                  uniqueDirectives.push(directive);
                }
              });
              directives = directives.concat(uniqueDirectives);
            }
            const matchingSpans = spansByType[type];
            if (matchingSpans) {
              const uniqueSpans: Span[] = [];
              matchingSpans.forEach(span => {
                if (!seenSpanIds[span.id]) {
                  idToColorMaps.spans[span.id] = layer.activityColor;
                  seenSpanIds[span.id] = true;
                  uniqueSpans.push(span);
                }
              });
              spans = spans.concat(uniqueSpans);
            }
          });
        }
      });
      directives.sort((a, b) => ((a.start_time_ms ?? 0) < (b.start_time_ms ?? 0) ? -1 : 1));
      spans.sort((a, b) => (a.startMs < b.startMs ? -1 : 1));
      if (directives.length || spans.length) {
        // Populate both sets of directive and span lists in order to more precisely
        // react to the filterActivitiesByTime variable later and avoid unnecessary activity tree
        // regeneration upon viewTimeRange change when not in filterActivitiesByTime mode.
        filteredActivityDirectives = directives;
        filteredSpans = spans;
        timeFilteredActivityDirectives = directives;
        timeFilteredSpans = spans;
      } else {
        filteredActivityDirectives = [];
        filteredSpans = [];
        timeFilteredActivityDirectives = [];
        timeFilteredSpans = [];
      }
    }
  }

  $: if (hasActivityLayer && filterActivitiesByTime && filteredActivityDirectives && filteredSpans && viewTimeRange) {
    timeFilteredSpans = filteredSpans.filter(span => spanInView(span, viewTimeRange));
    timeFilteredActivityDirectives = filteredActivityDirectives.filter(directive => {
      let inView = directiveInView(directive, viewTimeRange);
      if (inView && showSpans) {
        // Get max span bounds
        const rootSpanId = spanUtilityMaps.directiveIdToSpanIdMap[directive.id];
        const rootSpan = spansMap[rootSpanId];
        if (rootSpan) {
          return spanInView(rootSpan, viewTimeRange);
        }
      }
      return inView;
    });
  }

  $: if (
    hasActivityLayer &&
    timeFilteredActivityDirectives &&
    timeFilteredSpans &&
    activityOptions &&
    activityTreeExpansionMap &&
    typeof showSpans === 'boolean' &&
    typeof showDirectives === 'boolean'
  ) {
    if (activityOptions.displayMode === 'grouped') {
      /*  Note: here we only pass in a few variables in order to
       *  limit the scope of what is reacted to in order to avoid unnecessary re-rendering.
       *  A wrapper function is used to provide the other props needed to generate the tree.
       */
      activityTree = generateActivityTree(
        timeFilteredActivityDirectives,
        timeFilteredSpans,
        activityTreeExpansionMap,
        activityOptions.hierarchyMode,
      );
    } else {
      activityTree = [];
    }
  }

  function generateActivityTree(
    directives: ActivityDirective[],
    spans: Span[],
    activityTreeExpansionMap: ActivityTreeExpansionMap,
    hierarchyMode: ActivityOptions['hierarchyMode'] = 'flat',
  ) {
    return generateActivityTreeUtil(
      directives,
      spans,
      activityTreeExpansionMap,
      hierarchyMode,
      filterActivitiesByTime,
      spanUtilityMaps,
      spansMap,
      showSpans,
      showDirectives,
      viewTimeRange,
    );
  }

  function onActivityTreeNodeChange(e: { detail: ActivityTreeNode }) {
    const node = e.detail;
    dispatch('activityTreeExpansionChange', { ...(activityTreeExpansionMap || {}), [node.id]: !node.expanded });
  }

  function onActivityTimeFilterChange() {
    filterActivitiesByTime = !filterActivitiesByTime;
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
    dispatch('mouseDown', {
      ...detail,
      activityDirectives: detail?.activityDirectives ?? [],
      rowId: id,
      spans: detail?.spans ?? [],
    });
  }

  function onMouseOver(event: CustomEvent<RowMouseOverEvent>) {
    const { detail } = event;
    const { layerId } = detail;
    mouseOverActivityDirectives = detail?.activityDirectives ?? mouseOverActivityDirectives;
    mouseOverConstraintResults = detail?.constraintResults ?? mouseOverConstraintResults;
    mouseOverSpans = detail?.spans ?? mouseOverSpans;
    if (typeof layerId === 'number') {
      mouseOverPointsByLayer[layerId] = detail?.points ?? [];
      mouseOverGapsByLayer[layerId] = detail?.gaps ?? mouseOverGapsByLayer[layerId] ?? [];
    }

    dispatch('mouseOver', {
      ...detail,
      activityDirectives: mouseOverActivityDirectives,
      constraintResults: mouseOverConstraintResults,
      gapsByLayer: mouseOverGapsByLayer,
      pointsByLayer: mouseOverPointsByLayer,
      spans: mouseOverSpans,
    });
  }

  function onUpdateRowHeightDrag(event: CustomEvent<{ newHeight: number }>) {
    const { newHeight } = event.detail;
    dispatch('updateRowHeight', { newHeight, rowId: id });
  }

  function onUpdateRowHeightLayer(event: CustomEvent<{ newHeight: number }>) {
    const {
      detail: { newHeight },
    } = event;
    if (autoAdjustHeight) {
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
      {activityOptions}
      on:activity-tree-node-change={onActivityTreeNodeChange}
      on:mouseDown={onMouseDown}
      on:dblClick
      {activityTree}
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
      {selectedActivityDirectiveId}
      {selectedSpanId}
    >
      {#if hasActivityLayer && activityOptions?.displayMode === 'grouped'}
        <button
          class="st-button icon row-action"
          class:row-action-active={filterActivitiesByTime}
          on:click|stopPropagation={onActivityTimeFilterChange}
          use:tooltip={{ content: 'Filter Activities by Time Window', placement: 'top' }}
        >
          <FilterWithXIcon />
        </button>
      {/if}
    </RowHeader>

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
      <!-- Empty state -->
      {#if !layers.length}
        <div class="layer-message st-typography-label">No layers added to this row</div>
      {/if}
      <!-- Resource error indicator -->
      {#if hasResourceLayer && loadingErrors.length}
        <div class="layer-message error st-typography-label">
          Failed to load profiles for {loadingErrors.length} layer{pluralize(loadingErrors.length)}
        </div>
      {/if}
      <!-- Layers of Canvas Visualizations. -->
      <div class="layers" style="width: {drawWidth}px">
        {#each xRangeLayers as layer (layer.id)}
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
        {/each}
        {#if hasActivityLayer}
          <LayerActivities
            {activityOptions}
            {idToColorMaps}
            {activityTree}
            activityDirectives={filteredActivityDirectives}
            spans={filteredSpans}
            {activityDirectivesMap}
            {hasUpdateDirectivePermission}
            {showDirectives}
            {showSpans}
            {blur}
            {contextmenu}
            {dpr}
            drawHeight={computedDrawHeight}
            {drawWidth}
            {focus}
            {dblclick}
            {mousedown}
            {mousemove}
            {mouseout}
            {mouseup}
            {planEndTimeDoy}
            {plan}
            {planStartTimeYmd}
            {selectedActivityDirectiveId}
            {selectedSpanId}
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
        {#each lineLayers as layer (layer.id)}
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

  :global(.row-action.st-button.icon svg) {
    color: var(--st-gray-50);
  }

  :global(.row-action.st-button.icon:hover svg) {
    color: var(--st-gray-70);
  }

  :global(.row-action.row-action-active.st-button.icon svg) {
    color: var(--st-utility-blue);
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

  .active-row :global(.row-header) {
    background: rgba(47, 128, 237, 0.06);
  }

  .layer-message {
    align-items: center;
    color: var(--st-gray-50);
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
