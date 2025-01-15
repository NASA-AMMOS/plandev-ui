<svelte:options immutable={true} />

<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import { select, type Selection } from 'd3-selection';
  import { zoom as d3Zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
  import { groupBy } from 'lodash-es';
  import { createEventDispatcher } from 'svelte';
  import FilterWithXIcon from '../../assets/filter-with-x.svg?component';
  import { ViewDefaultDiscreteOptions } from '../../constants/view';
  import { Status } from '../../enums/status';
  import { activityArgumentDefaultsMap } from '../../stores/activities';
  import { catchError } from '../../stores/errors';
  import {
    derivationGroupVisibilityMap,
    externalSources,
    planDerivationGroupLinks,
  } from '../../stores/external-source';
  import { activityTypes } from '../../stores/plan';
  import {
    externalResources,
    fetchingResourcesExternal,
    resourceTypes,
    resourceTypesLoading,
  } from '../../stores/simulation';
  import { selectedRow, viewAddFilterToRow } from '../../stores/views';
  import type {
    ActivityDirective,
    ActivityDirectiveId,
    ActivityDirectivesMap,
    ActivityType,
  } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { ConstraintResultWithName } from '../../types/constraint';
  import type { ExternalEvent, ExternalEventId } from '../../types/external-event';
  import type { Plan } from '../../types/plan';
  import type {
    Resource,
    ResourceRequest,
    SimulationDataset,
    Span,
    SpanId,
    SpanUtilityMaps,
    SpansMap,
  } from '../../types/simulation';
  import type {
    ActivityOptions,
    Axis,
    DiscreteOptions,
    DiscreteTree,
    DiscreteTreeExpansionMap,
    DiscreteTreeNode,
    ExternalEventOptions,
    HorizontalGuide,
    Layer,
    MouseDown,
    MouseOver,
    Point,
    RowMouseOverEvent,
    TimeRange,
    TimelineItemMetadata,
    TimelineItemType,
    XAxisTick,
  } from '../../types/timeline';
  import { getAllSpansForActivityDirective } from '../../utilities/activities';
  import effects from '../../utilities/effects';
  import { getExternalEventRowId } from '../../utilities/externalEvents';
  import { classNames, unique } from '../../utilities/generic';
  import { showConfirmActivityCreationModal } from '../../utilities/modal';
  import { sampleProfiles } from '../../utilities/resources';
  import { getSimulationStatus } from '../../utilities/simulation';
  import { pluralize } from '../../utilities/text';
  import { getDoyTime } from '../../utilities/time';
  import {
    TimelineInteractionMode,
    applyActivityLayerFilter,
    directiveInView,
    externalEventInView,
    generateDiscreteTreeUtil,
    getMatchingTypesForActivityLayerFilter,
    getYAxesWithScaleDomains,
    isActivityLayer,
    isExternalEventLayer,
    isLineLayer,
    isXRangeLayer,
    spanInView,
    type TimelineLockStatus,
  } from '../../utilities/timeline';
  import { tooltip } from '../../utilities/tooltip';
  import ConstraintViolations from './ConstraintViolations.svelte';
  import LayerDiscrete from './LayerDiscrete.svelte';
  import LayerGaps from './LayerGaps.svelte';
  import LayerLine from './LayerLine.svelte';
  import LayerXRange from './LayerXRange.svelte';
  import RowDividerDropTarget from './RowDividerDropTarget.svelte';
  import RowDragHandleHeight from './RowDragHandleHeight.svelte';
  import RowHeader from './RowHeader.svelte';
  import RowHorizontalGuides from './RowHorizontalGuides.svelte';
  import RowXAxisTicks from './RowXAxisTicks.svelte';
  import RowYAxisTicks from './RowYAxisTicks.svelte';

  export let activityDirectives: ActivityDirective[] = [];
  export let externalEvents: ExternalEvent[] = [];
  export let activityDirectivesMap: ActivityDirectivesMap = {};
  export let discreteOptions: DiscreteOptions | undefined = undefined;
  export let discreteTreeExpansionMap: DiscreteTreeExpansionMap = {};
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
  export let index: number;
  export let layers: Layer[] = [];
  export let name: string = '';
  export let marginLeft: number = 50;
  export let planEndTimeDoy: string;
  export let plan: Plan | null = null;
  export let planStartTimeYmd: string;
  export let rowDragMoveDisabled = true;
  export let rowHeaderDragHandleWidthPx: number = 2;
  export let selectedActivityDirectiveId: ActivityDirectiveId | null = null;
  export let selectedExternalEventId: ExternalEventId | null = null;
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
    discreteTreeExpansionChange: DiscreteTreeExpansionMap;
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
  let mouseOverExternalEvents: ExternalEvent[] = [];
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
  let discreteTree: DiscreteTree = [];
  let filteredActivityDirectives: ActivityDirective[] = [];
  let filteredSpans: Span[] = [];
  let filterItemsByTime = false;
  let filteredExternalEvents: ExternalEvent[] = [];
  let idToColorMaps: {
    directives: Record<ActivityDirectiveId, string>;
    external_events: Record<ExternalEventId, string>;
    spans: Record<SpanId, string>;
  } = {
    directives: {},
    external_events: {},
    spans: {},
  };
  let timeFilteredActivityDirectives: ActivityDirective[] = [];
  let timeFilteredSpans: Span[] = [];
  let timeFilteredExternalEvents: ExternalEvent[] = [];
  let rowRef: HTMLDivElement;
  let hasActivityLayer: boolean = false;
  let hasExternalEventsLayer: boolean = false;
  let hasResourceLayer: boolean = false;

  $: if ($selectedRow?.id === id && rowRef) {
    rowRef.scrollIntoView({ block: 'nearest' });
  }

  $: if (plan && simulationDataset !== null && layers && $externalResources && !$resourceTypesLoading) {
    const simulationDatasetId = simulationDataset.dataset_id;
    const resourceNamesSet = new Set<string>();
    layers.map(layer => {
      if (layer.chartType === 'line' || layer.chartType === 'x-range') {
        if (layer.filter.resource) {
          resourceNamesSet.add(layer.filter.resource);
        }
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
        const isExternal = !$resourceTypes.find(type => type.name === name);
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
  } else if (simulationDataset === null) {
    Object.entries(resourceRequestMap).forEach(([_key, value]) => {
      value.controller?.abort();
    });
    resourceRequestMap = {};
  }

  $: onDragenter(dragenter);
  $: onDragleave(dragleave);
  $: onDragover(dragover);
  $: onDrop(drop);
  $: computedDrawHeight = expanded ? drawHeight : 24;
  $: overlaySvgSelection = select(overlaySvg) as Selection<SVGElement, unknown, any, any>;
  $: rowClasses = classNames('row', { 'row-collapsed': !expanded });
  $: discreteOptions = discreteOptions || { ...ViewDefaultDiscreteOptions };
  $: activityLayers = layers.filter(isActivityLayer);
  $: externalEventLayers = layers.filter(isExternalEventLayer);
  $: lineLayers = layers.filter(layer => isLineLayer(layer) || (isXRangeLayer(layer) && layer.showAsLinePlot));
  $: xRangeLayers = layers.filter(layer => isXRangeLayer(layer) && !layer.showAsLinePlot);
  $: showSpans =
    discreteOptions?.activityOptions?.composition === 'both' ||
    discreteOptions?.activityOptions?.composition === 'spans';
  $: showDirectives =
    discreteOptions?.activityOptions?.composition === 'both' ||
    discreteOptions?.activityOptions?.composition === 'directives';

  // helper for hasExternalEventsLayer; counts how many external event types are associated with this row
  // (if all layers have 0 event types, we don't want to allocate any canvas space in the row for the layer)
  $: associatedEventTypes = externalEventLayers
    .map(layer => (layer.filter.externalEvent ? layer.filter.externalEvent.event_types.length : 0))
    .reduce((currentSum, newValue) => currentSum + newValue, 0);

  // only consider a layer to be present if it is defined AND it actually has types/values selected.
  $: hasExternalEventsLayer = externalEventLayers.length > 0 && associatedEventTypes > 0;
  $: hasResourceLayer = lineLayers.length + xRangeLayers.length > 0;

  $: if (discreteTreeExpansionMap === undefined) {
    discreteTreeExpansionMap = {};
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

  $: if ((activityLayers && spansMap && activityDirectives) || hasExternalEventsLayer) {
    discreteTree = [];
    let updatedIdToColorMaps: {
      directives: Record<ActivityDirectiveId, string>;
      external_events: Record<ExternalEventId, string>;
      spans: Record<SpanId, string>;
    } = {
      directives: { ...idToColorMaps.directives },
      external_events: { ...idToColorMaps.external_events },
      spans: { ...idToColorMaps.spans },
    };
    if (activityLayers && spansMap && activityDirectives) {
      let spansList = Object.values(spansMap);
      if (activityLayers.length) {
        let directives: ActivityDirective[] = [];
        let spans: Span[] = [];

        // track directives and spans that have been seen to avoid double counting
        // if more than one layer matches a type
        let seenDirectiveIds: Record<number, boolean> = {};
        let seenSpanIds: Record<number, boolean> = {};
        activityLayers.forEach(layer => {
          if (layer.filter) {
            const { directives: matchingDirectives, spans: matchingSpans } = applyActivityLayerFilter(
              layer.filter.activity,
              activityDirectives,
              spansList,
              $activityTypes,
              $activityArgumentDefaultsMap,
            );
            const uniqueDirectives: ActivityDirective[] = [];
            matchingDirectives.forEach(directive => {
              if (!seenDirectiveIds[directive.id]) {
                idToColorMaps.directives[directive.id] = layer.activityColor;
                seenDirectiveIds[directive.id] = true;
                uniqueDirectives.push(directive);

                // Gather spans for directive since we always show all spans for a directive
                const childSpans = getAllSpansForActivityDirective(directive.id, spansMap, spanUtilityMaps);
                childSpans.forEach(span => {
                  seenSpanIds[span.span_id] = true;
                  idToColorMaps.spans[span.span_id] = layer.activityColor;
                });
                spans = spans.concat(childSpans);
              }
            });
            directives = directives.concat(uniqueDirectives);

            const uniqueSpans: Span[] = [];
            matchingSpans.forEach(span => {
              if (!seenSpanIds[span.span_id]) {
                idToColorMaps.spans[span.span_id] = layer.activityColor;
                seenSpanIds[span.span_id] = true;
                uniqueSpans.push(span);
              }
            });
            spans = spans.concat(uniqueSpans);
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

        hasActivityLayer = timeFilteredActivityDirectives.length > 0 || timeFilteredActivityDirectives.length > 0;
      } else {
        hasActivityLayer = false;
      }

      if (hasExternalEventsLayer) {
        let externalEventsFilteredByDG = [];
        filteredExternalEvents = [];

        let filteredDerivationGroups = $planDerivationGroupLinks
          .filter(
            link => link.plan_id === plan?.id && !($derivationGroupVisibilityMap[link.derivation_group_name] ?? true),
          )
          .map(link => link.derivation_group_name);

        // Apply filter for hiding derivation groups
        externalEventsFilteredByDG = externalEvents.filter(ee => {
          let derivationGroup =
            $externalSources.find(
              externalSource =>
                externalSource.derivation_group_name === ee.pkey.derivation_group_name &&
                externalSource.key === ee.pkey.source_key,
            )?.derivation_group_name ?? undefined;
          // the statement below says return true (keep) if the plan is not null and if the filter for this plan does not include this derivation group
          return plan && derivationGroup ? !filteredDerivationGroups.includes(derivationGroup) : false;
        });
        // Filter by external event type
        const externalEventsByType = groupBy(externalEventsFilteredByDG, 'pkey.event_type_name');
        externalEventLayers.forEach(layer => {
          if (layer.filter && layer.filter.externalEvent !== undefined) {
            const event_types = layer.filter.externalEvent.event_types || [];
            event_types.forEach(type => {
              const matchingEvents = externalEventsByType[type];
              if (matchingEvents) {
                matchingEvents.forEach(
                  event =>
                    (updatedIdToColorMaps.external_events[getExternalEventRowId(event.pkey)] =
                      layer.externalEventColor),
                );
                filteredExternalEvents = filteredExternalEvents.concat(unique(matchingEvents));
              }
            });
          }
        });
        filteredExternalEvents.sort((a, b) => (a.start_ms < b.start_ms ? -1 : 1));

        timeFilteredExternalEvents = filteredExternalEvents; // if not actively filtering by time
      }
    }
  }

  $: if (hasActivityLayer && filterItemsByTime && filteredActivityDirectives && filteredSpans && viewTimeRange) {
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
    timeFilteredExternalEvents = filteredExternalEvents.filter(event => externalEventInView(event, viewTimeRange));
  }

  $: if (
    (hasActivityLayer &&
      timeFilteredActivityDirectives &&
      timeFilteredSpans &&
      discreteOptions &&
      discreteOptions.activityOptions &&
      typeof showSpans === 'boolean' &&
      typeof showDirectives === 'boolean') ||
    !!(hasExternalEventsLayer && discreteOptions && discreteOptions.externalEventOptions && timeFilteredExternalEvents)
  ) {
    if (discreteOptions.displayMode === 'grouped' && expanded) {
      /*  Note: here we only pass in a few variables in order to
       *  limit the scope of what is reacted to in order to avoid unnecessary re-rendering.
       *  A wrapper function is used to provide the other props needed to generate the tree.
       */
      discreteTree = generateDiscreteTree(
        timeFilteredActivityDirectives,
        timeFilteredSpans,
        timeFilteredExternalEvents,
        discreteTreeExpansionMap,
        discreteOptions.activityOptions?.hierarchyMode,
        discreteOptions.externalEventOptions?.groupBy,
        hasExternalEventsLayer,
        hasActivityLayer,
      );
    } else {
      discreteTree = [];
    }
  }

  function generateDiscreteTree(
    directives: ActivityDirective[],
    spans: Span[],
    externalEvents: ExternalEvent[],
    discreteTreeExpansionMap: DiscreteTreeExpansionMap,
    hierarchyMode: ActivityOptions['hierarchyMode'] = 'flat',
    groupEventsByMethod: ExternalEventOptions['groupBy'] = 'event_type_name',
    hasExternalEventsLayer: boolean,
    hasActivityLayer: boolean,
  ) {
    return generateDiscreteTreeUtil(
      directives,
      spans,
      externalEvents,
      discreteTreeExpansionMap,
      hierarchyMode,
      groupEventsByMethod,
      filterItemsByTime,
      spanUtilityMaps,
      spansMap,
      showSpans,
      showDirectives,
      viewTimeRange,
      hasExternalEventsLayer,
      hasActivityLayer,
    );
  }

  function onDiscreteTreeNodeChange(e: { detail: DiscreteTreeNode }) {
    const node = e.detail;
    dispatch('discreteTreeExpansionChange', {
      ...(discreteTreeExpansionMap || {}),
      [node.id]: !node.expanded,
    });
  }

  function onItemTimeFilterChange() {
    filterItemsByTime = !filterItemsByTime;
  }

  function zoomed(e: D3ZoomEvent<HTMLCanvasElement, any>) {
    // Prevent dispatch when zoom did not originate from this row (i.e. propagated from zoomTransform)
    if (e.transform && timelineZoomTransform && e.transform.toString() === timelineZoomTransform.toString()) {
      return;
    }
    dispatch('zoom', e);
  }

  function onDragenter(e: DragEvent | undefined): void {
    if (
      hasUpdateDirectivePermission &&
      e &&
      overlaySvgSelection &&
      e.dataTransfer &&
      e.dataTransfer.effectAllowed === 'copyLink'
    ) {
      const g = overlaySvgSelection
        .append('g')
        .attr('y', 0)
        .attr('class', 'activity-drag-guide')
        .style('pointer-events', 'none');

      g.append('line')
        .attr('y1', 0)
        .attr('y2', computedDrawHeight)
        .attr('stroke-width', 2)
        .attr('stroke', 'var(--st-utility-blue)');

      const text = g
        .append('text')
        .attr('dx', '4px')
        .attr('dy', '11px')
        .attr('font-family', 'Inter')
        .attr('font-weight', '700')
        .attr('font-size', '10px')
        .attr('fill', 'white')
        .attr('opacity', '1')
        .attr('user-select', 'none')
        .text('Insert Activity');

      const textBBox = text.node()?.getBBox();
      if (textBBox) {
        g.append('rect')
          .attr('width', textBBox.width + 8)
          .attr('height', textBBox.height + 4)
          .attr('fill', 'var(--st-utility-blue)')
          .lower();
      }
    }
  }

  function onDragleave(e: DragEvent | undefined): void {
    if (e && overlaySvgSelection) {
      overlaySvgSelection.selectAll('.activity-drag-guide').remove();
    }
  }

  function onDragover(e: DragEvent | undefined): void {
    if (e && e.dataTransfer && (e.dataTransfer.effectAllowed === 'link' || !hasUpdateDirectivePermission)) {
      e.dataTransfer.dropEffect = 'none';
    }
    if (e && overlaySvgSelection) {
      const { offsetX } = e;
      overlaySvgSelection.select('.activity-drag-guide').attr('transform', `translate(${offsetX}, 0)`);
      const rect = overlaySvgSelection.select('.activity-drag-guide rect') as Selection<
        SVGRectElement,
        unknown,
        any,
        any
      >;
      const text = overlaySvgSelection.select('.activity-drag-guide text');
      const rectWidth = rect.node()?.getBBox()?.width ?? 0;
      const rectRight = offsetX + rectWidth;
      const overlaySvgSelectionWidth = overlaySvg.getBoundingClientRect().width;
      if (rectRight > overlaySvgSelectionWidth) {
        text.attr('dx', -rectWidth + 4);
        rect.attr('x', -rectWidth);
      } else {
        text.attr('dx', 4);
        rect.attr('x', 0);
      }
    }
  }

  async function onDrop(e: DragEvent | undefined): Promise<void> {
    if (e && overlaySvgSelection && xScaleView !== null) {
      const { offsetX } = e;
      overlaySvgSelection.selectAll('.activity-drag-guide').remove();
      if (e.dataTransfer !== null) {
        const unixEpochTime = xScaleView.invert(offsetX).getTime();
        const start_time = getDoyTime(new Date(unixEpochTime));
        const data = e.dataTransfer.getData('text');
        const json = JSON.parse(data || '');
        const type = json.type ?? '';
        const items = (json.items as TimelineItemType[]) ?? '';
        const metadata = (json.metadata as TimelineItemMetadata) ?? {};

        // Only allow creating an activity if we have an actual activity in the drag data.
        if (type === 'activity' && items && plan) {
          // Determine if the row will visualize all requested activities
          let typesInRow = new Set();
          activityLayers.forEach(layer => {
            const matchingTypes = getMatchingTypesForActivityLayerFilter(layer.filter.activity, $activityTypes);
            typesInRow = new Set([...typesInRow, ...matchingTypes.map(t => t.name)]);
          });
          const missingActivity = (items as ActivityType[]).find(item => !typesInRow.has(item.name));

          const createActivities = () => {
            items.forEach(item => {
              effects.createActivityDirective({}, start_time, item.name, item.name, {}, plan, user);
            });
          };

          // If the row is not configure to visualize all requested activities
          // we prompt the user to ask if they would like to continue anyway,
          // continue and add the filter, or cancel the operation
          if (missingActivity) {
            const { confirm, value } = await showConfirmActivityCreationModal();
            if (confirm) {
              if (value?.addFilter) {
                viewAddFilterToRow(
                  items,
                  type,
                  metadata,
                  id,
                  activityLayers.length ? activityLayers[0] : undefined,
                  index,
                );
              }
              createActivities();
            }
          } else {
            createActivities();
          }
        }
      }
    }
  }

  function onMouseDown(event: CustomEvent<RowMouseOverEvent>) {
    const { detail } = event;
    dispatch('mouseDown', {
      ...detail,
      activityDirectives: detail?.activityDirectives ?? [],
      externalEvents: detail?.externalEvents ?? [],
      rowId: id,
      spans: detail?.spans ?? [],
    });
  }

  function onMouseOver(event: CustomEvent<RowMouseOverEvent>) {
    const { detail } = event;
    const { layerId } = detail;
    mouseOverActivityDirectives = detail?.activityDirectives ?? mouseOverActivityDirectives;
    mouseOverExternalEvents = detail?.externalEvents ?? mouseOverExternalEvents;
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
      externalEvents: mouseOverExternalEvents,
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
    if (layer.filter.resource) {
      const resourceRequest = resourceRequestMap[layer.filter.resource];
      if (resourceRequest && !resourceRequest.loading && !resourceRequest.error && resourceRequest.resource) {
        resources.push(resourceRequest.resource);
      }
    }

    return resources;
  }

  function onTimelineItemsDrop(
    rowId?: number,
    type?: string,
    items?: TimelineItemType[],
    metadata?: TimelineItemMetadata,
    index?: number,
  ) {
    if (!type || !items) {
      return;
    }
    let layer: Layer | undefined;
    // Note: skipping resource layer assignment since only one resource
    // can be assigned to a layer
    if (type === 'activity') {
      // adding an activity
      layer = activityLayers[0];
    } else if (type === 'externalEvent' && items.length) {
      // adding an external event
      layer = externalEventLayers[0];
    }
    viewAddFilterToRow(items, type, metadata, rowId, layer, index);
  }
</script>

<div
  class="row-root"
  class:active-row={$selectedRow ? $selectedRow.id === id : false}
  class:expanded
  class:auto-height={autoAdjustHeight}
>
  {#if index === 0}
    <RowDividerDropTarget
      width={drawWidth + marginLeft}
      top={4}
      hintPosition="bottom"
      on:drop={event =>
        onTimelineItemsDrop(undefined, event.detail.type, event.detail.items, event.detail.metadata, -1)}
    />
  {/if}

  <div class="row-content">
    <!-- Row Header. -->
    <RowHeader
      {discreteOptions}
      on:discrete-tree-node-change={onDiscreteTreeNodeChange}
      on:mouseDown={onMouseDown}
      on:dblClick
      on:drop={event => onTimelineItemsDrop(id, event.detail.type, event.detail.items, event.detail.metadata)}
      {discreteTree}
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
      {selectedExternalEventId}
    >
      {#if (hasActivityLayer || hasExternalEventsLayer) && discreteOptions?.displayMode === 'grouped'}
        <button
          class="st-button icon row-action"
          class:row-action-active={filterItemsByTime}
          on:click|stopPropagation={onItemTimeFilterChange}
          use:tooltip={{ content: 'Filter Items by Time Window', placement: 'top' }}
        >
          <FilterWithXIcon />
        </button>
      {/if}
    </RowHeader>

    <div
      bind:this={rowRef}
      class={rowClasses}
      id={`row-${id}`}
      style={`cursor: ${
        timelineInteractionMode === TimelineInteractionMode.Navigate ? 'move' : ''
      }; height: ${computedDrawHeight}px;`}
    >
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
        {#if hasActivityLayer || hasExternalEventsLayer}
          <LayerDiscrete
            {discreteOptions}
            {idToColorMaps}
            {discreteTree}
            activityDirectives={filteredActivityDirectives}
            externalEvents={filteredExternalEvents}
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
            {dblclick}
            {expanded}
            {focus}
            {hasActivityLayer}
            {hasExternalEventsLayer}
            {mousedown}
            {mousemove}
            {mouseout}
            {mouseup}
            {planEndTimeDoy}
            {plan}
            {planStartTimeYmd}
            {selectedActivityDirectiveId}
            {selectedSpanId}
            {selectedExternalEventId}
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
      <!-- Overlay for Pointer Events. -->
      <svg
        bind:this={overlaySvg}
        class="overlay"
        role="none"
        style="width: {drawWidth}px"
        on:blur={event => (blur = event)}
        on:contextmenu={event => (contextmenu = event)}
        on:dragenter|preventDefault={event => (dragenter = event)}
        on:dragleave={event => (dragleave = event)}
        on:dragover|preventDefault={event => (dragover = event)}
        on:drop|preventDefault={event => (drop = event)}
        on:focus={event => (focus = event)}
        on:mousedown={event => (mousedown = event)}
        on:mousemove={event => (mousemove = event)}
        on:mouseout={event => (mouseout = event)}
        on:mouseup={event => (mouseup = event)}
        on:dblclick={event => (dblclick = event)}
      />
    </div>
  </div>

  <RowDividerDropTarget
    width={drawWidth + marginLeft}
    on:drop={e => onTimelineItemsDrop(undefined, e.detail.type, e.detail.items, e.detail.metadata, index)}
  />
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
    z-index: 4;
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
    z-index: 4;
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
