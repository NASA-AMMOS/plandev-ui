<svelte:options immutable={true} />

<script lang="ts">
  import {
    attachClosestEdge,
    extractClosestEdge,
    type Edge,
  } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
  import {
    draggable,
    dropTargetForElements,
    monitorForElements,
  } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
  import type { ScaleTime } from 'd3-scale';
  import { zoomIdentity, type D3ZoomEvent, type ZoomTransform } from 'd3-zoom';
  import { throttle } from 'lodash-es';
  import { afterUpdate, createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
  import { InvalidDate } from '../../constants/time';
  import { ViewDefaultSectionColor } from '../../constants/view';
  import { directiveBuilderIsVisible, updateDirectiveBuilder } from '../../stores/directiveBuilder';
  import { planDerivationGroupLinks } from '../../stores/external-source';
  import { plugins } from '../../stores/plugins';
  import {
    selectedRow,
    selectedSectionId,
    viewAddSection,
    viewAddTimelineRow,
    viewDeleteSection,
    viewReorderTimelineItems,
    viewSetAllExpanded,
    viewSetSelectedSection,
    viewTogglePanel,
    viewUpdateSection,
    viewUpdateTimeline,
  } from '../../stores/views';
  import type { ActivityDirectiveId, ActivityDirectivesMap } from '../../types/activity';
  import type { User } from '../../types/app';
  import type { ConstraintResultWithName } from '../../types/constraint';
  import type { ExternalEvent, ExternalEventId } from '../../types/external-event';
  import type { Plan } from '../../types/plan';
  import type {
    ResourceType,
    Simulation,
    SimulationDataset,
    Span,
    SpanId,
    SpanUtilityMaps,
    SpansMap,
  } from '../../types/simulation';
  import type {
    DiscreteTreeExpansionMap,
    MouseDown,
    MouseOver,
    Row,
    TimeRange,
    Timeline,
    TimelineItemRef,
    TimelineSection,
    XAxisTick,
  } from '../../types/timeline';
  import { clamp } from '../../utilities/generic';
  import { formatDate } from '../../utilities/time';
  import {
    MAX_CANVAS_SIZE,
    TimelineInteractionMode,
    TimelineLockStatus,
    applyTimelineItemDrop,
    getRenderableTimelineItems,
    getXScale,
    moveTimelineItemInHierarchy,
    resolveSectionDropEdge,
    toTimelineDropEdge,
  } from '../../utilities/timeline';
  import TimelineRow from './Row.svelte';
  import RowHeaderDragHandleWidth from './RowHeaderDragHandleWidth.svelte';
  import TimelineContextMenu from './TimelineContextMenu.svelte';
  import TimelineCursors from './TimelineCursors.svelte';
  import TimelineHistogram from './TimelineHistogram.svelte';
  import TimelineSectionHeader from './TimelineSectionHeader.svelte';
  import TimelineSimulationRange from './TimelineSimulationRange.svelte';
  import TimelineTimeDisplay from './TimelineTimeDisplay.svelte';
  import Tooltip from './TimelineTooltip.svelte';
  import TimelineXAxis from './XAxis.svelte';

  export let activityDirectivesMap: ActivityDirectivesMap | null = null;
  export let externalEvents: ExternalEvent[] = [];
  export let constraintResults: ConstraintResultWithName[] = [];
  export let hasUpdateDirectivePermission: boolean = false;
  export let hasUpdateSimulationPermission: boolean = false;
  export let initialActivityDirectivesLoading: boolean = false;
  export let initialConstraintsLoading: boolean = false;
  export let initialSpansLoading: boolean = false;
  export let maxTimeRange: TimeRange = { end: 0, start: 0 };
  export let planEndTimeDoy: string;
  export let plan: Plan | null = null;
  export let planStartTimeYmd: string;
  export let resourceTypes: ResourceType[] = [];
  export let selectedActivityDirectiveId: ActivityDirectiveId | null = null;
  export let selectedExternalEventId: ExternalEventId | null = null;
  export let selectedSpanId: SpanId | null = null;
  export let simulation: Simulation | null = null;
  export let simulationDataset: SimulationDataset | null = null;
  export let spanUtilityMaps: SpanUtilityMaps;
  export let spansMap: SpansMap | null = {};
  export let spans: Span[] | null = [];
  export let timeline: Timeline | null = null;
  export let timelineInteractionMode: TimelineInteractionMode;
  export let timelineLockStatus: TimelineLockStatus;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };
  export let user: User | null;

  export let decimate: boolean = false;
  export let interpolateHoverValue: boolean = false;
  export let showTimelineTooltip: boolean = false;
  export let limitTooltipToLine: boolean = false;

  const dispatch = createEventDispatcher<{
    duplicateSection: TimelineSection;
    mouseDown: MouseDown;
    toggleRowExpansion: { expanded: boolean; rowId: number };
    updateRowHeight: {
      newHeight: number;
      rowId: number;
      wasAutoAdjusted?: boolean;
    };
    viewTimeRangeChanged: TimeRange;
  }>();

  let discreteTreeExpansionMapByRow: Record<string, DiscreteTreeExpansionMap> = {};
  let timelineZoomTransform: ZoomTransform | null = null;
  let clientWidth: number = 0;
  let contextMenu: MouseOver | null;
  let contextMenuComponent: TimelineContextMenu;
  let dpr: number = 1;
  let externalEventsFilteredByDG: ExternalEvent[] = [];
  let tooltip: Tooltip;
  let cursorEnabled: boolean = true;
  let cursorHeaderHeight: number = 0;
  let histogramCursorTime: Date | null = null;
  let mouseOver: MouseOver | null;
  let removeDPRChangeListener: (() => void) | null = null;
  let items: TimelineItemRef[] = [];
  let rowDragMoveDisabled = true;
  let rowHeaderDragHandleWidthPx: number = 2;
  let rows: Row[] = [];
  let rowsMaxHeight: number = 600;
  let sectionDragDisabled = true;
  let sections: TimelineSection[] = [];

  type DragData = {
    itemId: number;
    itemType: 'section' | 'row';
    sourceSectionId: number | null; // null means root level
  };
  // A Set so an action's destroy() can drop its own entry. As an array it only ever grew, holding
  // every detached row alive through a session's worth of reorders.
  let cleanupFunctions: Set<() => void> = new Set();
  let monitorCleanup: (() => void) | null = null;
  let tickCount: number = 10;
  let timelineDiv: HTMLDivElement;
  let timelineHistogramDiv: HTMLDivElement;
  let timelineHistogramDrawHeight: number = 40;
  let xAxisDiv: HTMLDivElement;
  let xAxisDrawHeight: number = 64;
  let xTicksView: XAxisTick[] = [];
  let derivationGroups: string[] = [];

  let throttledZoom = throttle(onZoom, 16, {
    leading: true,
    trailing: true,
  });

  let throttledHistogramViewTimeRangeChanged = throttle(onHistogramViewTimeRangeChanged, 16, {
    leading: true,
    trailing: true,
  });

  $: activityDirectives = activityDirectivesMap ? Object.values(activityDirectivesMap) : null;
  $: derivationGroups = $planDerivationGroupLinks
    .filter(link => link.plan_id === plan?.id)
    .map(link => link.derivation_group_name);
  $: externalEventsFilteredByDG = externalEvents.filter(externalEvent =>
    derivationGroups.includes(externalEvent.pkey.derivation_group_name),
  );
  $: rows = timeline?.rows || [];
  $: sections = timeline?.sections || [];
  // Never render straight from timeline.items: a stale ref collides with a reused id and throws
  // out of the keyed each below. The drag and move helpers take the healed order too, so a
  // mutation writes it back.
  $: items = timeline ? getRenderableTimelineItems(timeline) : [];
  $: hierarchy = { items, sections };
  $: rowsById = new Map(rows.map(row => [row.id, row]));
  $: sectionsById = new Map(sections.map(section => [section.id, section]));

  $: drawWidth = clientWidth > 0 ? clientWidth - (timeline?.marginLeft ?? 0) - (timeline?.marginRight ?? 0) : 0;
  $: xAxisDrawHeight = 48 + 16 * ($plugins.time.additional.length ? Math.max($plugins.time.additional.length, 1) : 1);

  // Compute number of ticks based off draw width
  $: if (drawWidth) {
    const padding = 1.5;
    let ticks = Math.round(drawWidth / ($plugins.time.ticks.maxLabelWidth * padding));
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
  $: formattedPlanStartTime = formatDate(xDomainMax[0], $plugins.time.primary.format);
  $: formattedPlanEndTime = formatDate(xDomainMax[1], $plugins.time.primary.format);

  $: if (viewTimeRangeStartDate && viewTimeRangeEndDate && tickCount) {
    xTicksView = $plugins.time.ticks.getTicks(viewTimeRangeStartDate, viewTimeRangeEndDate, tickCount).map(date => {
      const label = $plugins.time.primary.formatTick(date, xScaleViewDuration, tickCount) ?? InvalidDate;
      const additionalLabels = $plugins.time.additional.map(timeSystem => {
        return timeSystem.formatTick
          ? (timeSystem.formatTick(date, xScaleViewDuration, tickCount) ?? InvalidDate)
          : (timeSystem.format(date) ?? InvalidDate);
      });
      return { additionalLabels, date, label };
    });
  }

  afterUpdate(() => {
    setRowsMaxHeight(timelineDiv, xAxisDiv, timelineHistogramDiv);
  });

  // Fallback for rapid or cancelled drags, where the library's own callbacks may not fire.
  function handleNativeDragEnd() {
    cleanupAllDragStates();
  }

  onDestroy(() => {
    if (removeDPRChangeListener !== null) {
      removeDPRChangeListener();
    }
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions.clear();
    if (monitorCleanup) {
      monitorCleanup();
      monitorCleanup = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('dragend', handleNativeDragEnd);
      window.removeEventListener('drop', handleNativeDragEnd);
    }
    cleanupAllDragStates();
  });

  onMount(() => {
    detectDPRChange();

    window.addEventListener('dragend', handleNativeDragEnd);
    window.addEventListener('drop', handleNativeDragEnd);

    monitorCleanup = monitorForElements({
      onDragStart: cleanupAllDragStates,
      onDrop: cleanupAllDragStates,
    });
  });

  /**
   * Clears drag feedback classes left behind when a drag is cancelled and the library's callbacks
   * do not fire. Scoped to this timeline: the editor panel's drag targets use the same names.
   */
  function cleanupAllDragStates() {
    if (!timelineDiv) {
      return;
    }

    ['dragging', 'drop-target-active', 'drop-indicator-top', 'drop-indicator-bottom', 'section-accepting-row'].forEach(
      cls => timelineDiv.querySelectorAll(`.${cls}`).forEach(element => element.classList.remove(cls)),
    );
  }

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

  function onToggleSectionCollapsed(event: CustomEvent<{ collapsed: boolean; sectionId: number }>) {
    const { sectionId, collapsed } = event.detail;
    viewUpdateSection('collapsed', collapsed, sectionId, timeline?.id);
  }

  function onMouseDownSectionMove() {
    sectionDragDisabled = false;
  }

  function onMouseUpSectionMove() {
    sectionDragDisabled = true;
  }

  function onSectionContextMenu(event: CustomEvent<MouseEvent>, section: TimelineSection) {
    contextMenu = { e: event.detail, origin: 'section-header', section };
    tooltip.hide();
  }

  function onEditSection(event: CustomEvent<TimelineSection>) {
    viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'TimelineEditorPanel' } });
    viewSetSelectedSection(event.detail.id);
  }

  function onAddRowToSection(event: CustomEvent<TimelineSection>) {
    viewAddTimelineRow(timeline?.id, false, event.detail.id);
  }

  function onDeleteSection(event: CustomEvent<TimelineSection>) {
    viewDeleteSection(event.detail.id, true, timeline?.id);
  }

  function onSetAllExpanded(event: CustomEvent<{ expanded: boolean }>) {
    viewSetAllExpanded(event.detail.expanded, timeline?.id);
  }

  /**
   * Sections do not nest, so one inserted from a row inside a section goes after that whole
   * section rather than into it. With no row under the cursor the section appends.
   */
  function onInsertSection(event: CustomEvent<{ row: Row | null }>) {
    const { row } = event.detail;
    const owningSection = row ? sections.find(section => section.rowIds.includes(row.id)) : undefined;
    const insertAfter: TimelineItemRef | null = owningSection
      ? { id: owningSection.id, type: 'section' }
      : row
        ? { id: row.id, type: 'row' }
        : null;

    viewAddSection(timeline?.id, undefined, insertAfter);
  }

  function onUpdateRowHeight(event: CustomEvent<{ newHeight: number; rowId: number; wasAutoAdjusted?: boolean }>) {
    const { newHeight, rowId, wasAutoAdjusted } = event.detail;
    if (newHeight < MAX_CANVAS_SIZE) {
      dispatch('updateRowHeight', { newHeight, rowId, wasAutoAdjusted });
    }
  }

  export function viewTimeRangeChanged(viewTimeRange: TimeRange, zoomTransform?: ZoomTransform) {
    dispatch('viewTimeRangeChanged', viewTimeRange);
    // Assign zoom transform if provided to synchronize all d3 zoom handlers
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

  function onCollapseDiscreteTree(event: CustomEvent<Row>) {
    const row = event.detail;
    discreteTreeExpansionMapByRow = { ...discreteTreeExpansionMapByRow, [row.id]: {} };
  }

  function onHistogramCursorTimeChanged(event: CustomEvent<Date | null>) {
    histogramCursorTime = event.detail;
  }

  function onUpdateRowHeaderWidth(event: CustomEvent<{ newWidth: number }>) {
    const { newWidth } = event.detail;
    viewUpdateTimeline('marginLeft', newWidth, timeline?.id);
    mouseOver = null;
    histogramCursorTime = null;
  }

  /**
   * Moves a row or section one place within whichever container holds it. Display order lives in
   * items/rowIds, so reordering timeline.rows - which this used to do - changes nothing on screen.
   */
  function moveTimelineItem(type: 'row' | 'section', id: number, direction: 'up' | 'down') {
    if (!timeline) {
      return;
    }

    const next = moveTimelineItemInHierarchy(hierarchy, type, id, direction);

    if (next === null) {
      return;
    }

    viewReorderTimelineItems(next.items, timeline.id, next.sections);
  }

  function onMoveRow(event: CustomEvent<{ direction: 'up' | 'down'; row: Row }>) {
    const {
      detail: { direction, row },
    } = event;
    moveTimelineItem('row', row.id, direction);
  }

  function onMoveSection(event: CustomEvent<{ direction: 'up' | 'down'; section: TimelineSection }>) {
    const {
      detail: { direction, section },
    } = event;
    moveTimelineItem('section', section.id, direction);
  }

  function handleTimelineItemDrop(
    sourceData: DragData,
    targetItemId: number,
    targetItemType: 'section' | 'row',
    targetSectionId: number | null,
    edge: Edge | null,
  ) {
    if (!timeline) {
      return;
    }

    const next = applyTimelineItemDrop(hierarchy, {
      edge: toTimelineDropEdge(edge),
      source: sourceData,
      target: { itemId: targetItemId, itemType: targetItemType, sectionId: targetSectionId },
    });

    if (next === null) {
      return;
    }

    viewReorderTimelineItems(next.items, timeline.id, next.sections);
  }

  /** Rows and sections alike drag only from their handle or their title. */
  function isRowDragHandle(element: Element | null): boolean {
    if (!element) {
      return false;
    }
    const dragHandleSelectors = [
      '.row-drag-handle-container',
      '.row-header-title',
      '.section-drag-handle',
      '.section-title',
    ];
    for (const selector of dragHandleSelectors) {
      if (element.closest(selector)) {
        return true;
      }
    }
    return false;
  }

  function makeTimelineItemDraggable(
    node: HTMLElement,
    params: { itemId: number; itemType: 'section' | 'row'; sectionId: number | null },
  ) {
    const cleanup = draggable({
      canDrag: ({ input }) => isRowDragHandle(document.elementFromPoint(input.clientX, input.clientY)),
      element: node,
      getInitialData: () =>
        ({
          itemId: params.itemId,
          itemType: params.itemType,
          sourceSectionId: params.sectionId,
        }) as DragData,
      onDragStart: () => {
        node.classList.add('dragging');
      },
      onDrop: () => {
        node.classList.remove('dragging');
      },
    });

    cleanupFunctions.add(cleanup);

    return {
      destroy() {
        cleanup();
        cleanupFunctions.delete(cleanup);
      },
      update(newParams: { itemId: number; itemType: 'section' | 'row'; sectionId: number | null }) {
        params = newParams;
      },
    };
  }

  function makeTimelineItemDropTarget(
    node: HTMLElement,
    params: { itemId: number; itemType: 'section' | 'row'; sectionId: number | null },
  ) {
    const cleanup = dropTargetForElements({
      canDrop: ({ source }) => {
        const sourceData = source.data as DragData;
        // Only our own row and section draggables; activity drags land elsewhere.
        if (sourceData.itemType !== 'section' && sourceData.itemType !== 'row') {
          return false;
        }
        // Sections do not nest, and nothing drops onto itself.
        if (sourceData.itemType === 'section' && params.sectionId !== null) {
          return false;
        }
        if (sourceData.itemId === params.itemId && sourceData.itemType === params.itemType) {
          return false;
        }
        return true;
      },
      element: node,
      getData: ({ element, input }) => {
        const data = {
          itemId: params.itemId,
          itemType: params.itemType,
          sectionId: params.sectionId,
        };
        return attachClosestEdge(data, {
          allowedEdges: ['top', 'bottom'],
          element,
          input,
        });
      },
      onDrag: ({ self }) => {
        const edge = extractClosestEdge(self.data);
        updateDropIndicator(node, edge);
      },
      onDragEnter: ({ self }) => {
        const edge = extractClosestEdge(self.data);
        node.classList.add('drop-target-active');
        updateDropIndicator(node, edge);
      },
      onDragLeave: () => {
        node.classList.remove('drop-target-active');
        removeDropIndicator(node);
      },
      onDrop: ({ self, source }) => {
        const sourceData = source.data as DragData;
        const edge = extractClosestEdge(self.data);
        node.classList.remove('drop-target-active');
        removeDropIndicator(node);

        handleTimelineItemDrop(sourceData, params.itemId, params.itemType, params.sectionId, edge);
      },
    });

    cleanupFunctions.add(cleanup);

    return {
      destroy() {
        cleanup();
        cleanupFunctions.delete(cleanup);
      },
      update(newParams: { itemId: number; itemType: 'section' | 'row'; sectionId: number | null }) {
        params = newParams;
      },
    };
  }

  /** Reads the geometry off the DOM; the decision itself lives in a tested utility. */
  function sectionDropEdge(element: Element, clientY: number, sourceData: DragData) {
    return resolveSectionDropEdge(element.getBoundingClientRect(), clientY, sourceData.itemType);
  }

  /**
   * A section is both a reorder target (its edges) and a container that accepts rows dropped into
   * it. Both have to live in a SINGLE drop target: two registered on one element leaves only the
   * last active, which swallowed the top edge and made the slot above a leading section
   * unreachable.
   */
  function makeSectionDropTarget(node: HTMLElement, params: { sectionId: number }) {
    function showFeedback(edge: Edge | null) {
      if (edge === null) {
        removeDropIndicator(node);
        node.classList.add('section-accepting-row');
      } else {
        node.classList.remove('section-accepting-row');
        updateDropIndicator(node, edge);
      }
    }

    function clearFeedback() {
      node.classList.remove('section-accepting-row');
      removeDropIndicator(node);
    }

    const cleanup = dropTargetForElements({
      canDrop: ({ source }) => {
        const sourceData = source.data as DragData;
        if (sourceData.itemType !== 'row' && sourceData.itemType !== 'section') {
          return false;
        }
        // A section cannot be dropped onto itself, but a row already inside this section can
        // still be dragged to an edge to move it back out to the root level.
        return !(sourceData.itemType === 'section' && sourceData.itemId === params.sectionId);
      },
      element: node,
      onDrag: ({ location, self, source }) => {
        showFeedback(sectionDropEdge(self.element, location.current.input.clientY, source.data as DragData));
      },
      onDragEnter: ({ location, self, source }) => {
        showFeedback(sectionDropEdge(self.element, location.current.input.clientY, source.data as DragData));
      },
      onDragLeave: clearFeedback,
      onDrop: ({ location, self, source }) => {
        const sourceData = source.data as DragData;
        const edge = sectionDropEdge(self.element, location.current.input.clientY, sourceData);
        clearFeedback();
        handleTimelineItemDrop(sourceData, params.sectionId, 'section', null, edge);
      },
    });

    cleanupFunctions.add(cleanup);

    return {
      destroy() {
        cleanup();
        cleanupFunctions.delete(cleanup);
      },
      update(newParams: { sectionId: number }) {
        params = newParams;
      },
    };
  }

  /**
   * The "Drag a row here" placeholder, which otherwise pointed at a spot that accepted nothing.
   * Everything landing here goes INTO the section (edge null); its header edges do the reordering.
   */
  function makeEmptySectionDropTarget(node: HTMLElement, params: { sectionId: number }) {
    const cleanup = dropTargetForElements({
      canDrop: ({ source }) => (source.data as DragData).itemType === 'row',
      element: node,
      onDragEnter: () => node.classList.add('section-accepting-row'),
      onDragLeave: () => node.classList.remove('section-accepting-row'),
      onDrop: ({ source }) => {
        node.classList.remove('section-accepting-row');
        handleTimelineItemDrop(source.data as DragData, params.sectionId, 'section', null, null);
      },
    });

    cleanupFunctions.add(cleanup);

    return {
      destroy() {
        cleanup();
        cleanupFunctions.delete(cleanup);
      },
      update(newParams: { sectionId: number }) {
        params = newParams;
      },
    };
  }

  function updateDropIndicator(node: HTMLElement, edge: Edge | null) {
    node.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
    if (edge === 'top') {
      node.classList.add('drop-indicator-top');
    } else if (edge === 'bottom') {
      node.classList.add('drop-indicator-bottom');
    }
  }

  function removeDropIndicator(node: HTMLElement) {
    node.classList.remove('drop-indicator-top', 'drop-indicator-bottom');
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

  function onBuildActivityDirective(startTime: string, activityType: string) {
    updateDirectiveBuilder({ startTime, type: activityType });
    $directiveBuilderIsVisible = true;
  }
</script>

<svelte:window on:keydown={onKeyDown} />

<div bind:this={timelineDiv} bind:clientWidth class="timeline" id={`timeline-${timeline?.id}`}>
  <div bind:this={timelineHistogramDiv} class="timeline-time-row">
    {#if plan}
      <TimelineTimeDisplay
        planStartTime={formattedPlanStartTime}
        planEndTime={formattedPlanEndTime}
        timeLabel={$plugins.time.primary.label}
        width={timeline?.marginLeft}
      />
    {/if}
    <div class="timeline-histogram-container">
      <TimelineHistogram
        activityDirectives={activityDirectives || []}
        loading={initialActivityDirectivesLoading || initialSpansLoading || initialConstraintsLoading}
        externalEvents={externalEventsFilteredByDG}
        {constraintResults}
        {cursorEnabled}
        drawHeight={timelineHistogramDrawHeight}
        {drawWidth}
        {mouseOver}
        {planStartTimeYmd}
        {simulationDataset}
        spans={spans || []}
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

    {#if items.length > 0}
      <div class="rows" style="max-height: {rowsMaxHeight}px" on:wheel={handleScroll}>
        {#each items as item, i (`${item.type}-${item.id}`)}
          {#if item.type === 'section'}
            {@const section = sectionsById.get(item.id)}
            {#if section}
              <!-- One named group, so assistive tech (and tests) can address a section by name
                   and reach only the rows it contains. -->
              <div
                class="timeline-section-wrapper"
                class:active-section={$selectedSectionId === section.id}
                role="group"
                aria-label={section.name}
              >
                <!-- On the header, not the wrapper: a wrapper target would enclose the section's
                     own row targets, and every target in the hierarchy is notified - so a drop on
                     a row would be handled twice, as a row and again as its section. -->
                <div
                  class="timeline-section-header-drop"
                  use:makeTimelineItemDraggable={{ itemId: section.id, itemType: 'section', sectionId: null }}
                  use:makeSectionDropTarget={{ sectionId: section.id }}
                >
                  <TimelineSectionHeader
                    {section}
                    width={(timeline?.marginLeft ?? 0) + drawWidth}
                    dragDisabled={sectionDragDisabled}
                    on:toggleCollapsed={onToggleSectionCollapsed}
                    on:mouseDownSectionMove={onMouseDownSectionMove}
                    on:mouseUpSectionMove={onMouseUpSectionMove}
                    on:contextMenu={e => onSectionContextMenu(e, section)}
                    on:editSection={() => onEditSection(new CustomEvent('editSection', { detail: section }))}
                    on:addRowToSection={() =>
                      onAddRowToSection(new CustomEvent('addRowToSection', { detail: section }))}
                    on:duplicateSection={() => dispatch('duplicateSection', section)}
                    on:moveSection={e => moveTimelineItem('section', section.id, e.detail.direction)}
                    on:deleteSection={() => onDeleteSection(new CustomEvent('deleteSection', { detail: section }))}
                  />
                </div>
                {#if !section.collapsed && section.rowIds.length === 0}
                  <!-- An empty section used to render as nothing, which read as broken. The whole
                       strip accepts a row; the affordance is drawn in the row-header gutter. -->
                  <div
                    class="section-empty"
                    style:--section-accent-color={section.color || ViewDefaultSectionColor}
                    style:width={`${(timeline?.marginLeft ?? 0) + drawWidth}px`}
                    use:makeEmptySectionDropTarget={{ sectionId: section.id }}
                  >
                    <div
                      class="section-empty-hint st-typography-body"
                      style:width={`${Math.max(120, (timeline?.marginLeft ?? 0) - 23)}px`}
                    >
                      Drag a row here
                    </div>
                  </div>
                {/if}
                {#if !section.collapsed}
                  {#each section.rowIds as rowId, rowIndex (`section-${section.id}-row-${rowId}`)}
                    {@const row = rowsById.get(rowId)}
                    {#if row}
                      <div
                        class="timeline-row-wrapper timeline-row-in-section"
                        class:selected-row-outline={$selectedRow?.id === row.id}
                        style:--section-accent-color={section.color || ViewDefaultSectionColor}
                        use:makeTimelineItemDraggable={{ itemId: row.id, itemType: 'row', sectionId: section.id }}
                        use:makeTimelineItemDropTarget={{ itemId: row.id, itemType: 'row', sectionId: section.id }}
                      >
                        <TimelineRow
                          {activityDirectives}
                          {activityDirectivesMap}
                          externalEvents={externalEventsFilteredByDG}
                          discreteTreeExpansionMap={discreteTreeExpansionMapByRow[row.id]}
                          on:discreteTreeExpansionChange={event => {
                            discreteTreeExpansionMapByRow = {
                              ...discreteTreeExpansionMapByRow,
                              [row.id]: event.detail,
                            };
                          }}
                          discreteOptions={row.discreteOptions}
                          autoAdjustHeight={row.autoAdjustHeight}
                          {constraintResults}
                          {dpr}
                          drawHeight={row.height}
                          {drawWidth}
                          expanded={row.expanded}
                          {hasUpdateDirectivePermission}
                          horizontalGuides={row.horizontalGuides}
                          id={row.id}
                          index={rowIndex}
                          layers={row.layers}
                          name={row.name}
                          marginLeft={timeline?.marginLeft}
                          {planEndTimeDoy}
                          {plan}
                          {planStartTimeYmd}
                          {rowDragMoveDisabled}
                          {decimate}
                          {interpolateHoverValue}
                          {limitTooltipToLine}
                          {rowHeaderDragHandleWidthPx}
                          {selectedActivityDirectiveId}
                          {selectedExternalEventId}
                          {selectedSpanId}
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
                          on:buildDirective={e => onBuildActivityDirective(e.detail.startTime, e.detail.type)}
                          on:dblClick
                          on:deleteActivityDirective
                          on:mouseDown={onMouseDown}
                          on:mouseDownRowMove={onMouseDownRowMove}
                          on:mouseUpRowMove={onMouseUpRowMove}
                          on:mouseOver={e => (mouseOver = { ...e.detail, row })}
                          on:toggleRowExpansion={onToggleRowExpansion}
                          on:updateRowHeight={onUpdateRowHeight}
                          on:updateYAxes
                          on:zoom={throttledZoom}
                        />
                      </div>
                    {/if}
                  {/each}
                {/if}
              </div>
            {/if}
          {:else}
            {@const row = rowsById.get(item.id)}
            {#if row}
              <div
                class="timeline-row-wrapper"
                use:makeTimelineItemDraggable={{ itemId: row.id, itemType: 'row', sectionId: null }}
                use:makeTimelineItemDropTarget={{ itemId: row.id, itemType: 'row', sectionId: null }}
              >
                <TimelineRow
                  {activityDirectives}
                  {activityDirectivesMap}
                  externalEvents={externalEventsFilteredByDG}
                  discreteTreeExpansionMap={discreteTreeExpansionMapByRow[row.id]}
                  on:discreteTreeExpansionChange={event => {
                    discreteTreeExpansionMapByRow = { ...discreteTreeExpansionMapByRow, [row.id]: event.detail };
                  }}
                  discreteOptions={row.discreteOptions}
                  autoAdjustHeight={row.autoAdjustHeight}
                  {constraintResults}
                  {dpr}
                  drawHeight={row.height}
                  {drawWidth}
                  expanded={row.expanded}
                  {hasUpdateDirectivePermission}
                  horizontalGuides={row.horizontalGuides}
                  id={row.id}
                  index={i}
                  layers={row.layers}
                  name={row.name}
                  marginLeft={timeline?.marginLeft}
                  {planEndTimeDoy}
                  {plan}
                  {planStartTimeYmd}
                  {rowDragMoveDisabled}
                  {decimate}
                  {interpolateHoverValue}
                  {limitTooltipToLine}
                  {rowHeaderDragHandleWidthPx}
                  {selectedActivityDirectiveId}
                  {selectedExternalEventId}
                  {selectedSpanId}
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
                  on:buildDirective={e => onBuildActivityDirective(e.detail.startTime, e.detail.type)}
                  on:dblClick
                  on:deleteActivityDirective
                  on:mouseDown={onMouseDown}
                  on:mouseDownRowMove={onMouseDownRowMove}
                  on:mouseUpRowMove={onMouseUpRowMove}
                  on:mouseOver={e => (mouseOver = { ...e.detail, row })}
                  on:toggleRowExpansion={onToggleRowExpansion}
                  on:updateRowHeight={onUpdateRowHeight}
                  on:updateYAxes
                  on:zoom={throttledZoom}
                />
              </div>
            {/if}
          {/if}
        {/each}
        <div class="new-row">
          <button on:click={_ => viewAddTimelineRow(timeline?.id, true)} class="st-button tertiary w-full">
            New Row +
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Timeline Tooltip. -->
  <Tooltip bind:this={tooltip} {mouseOver} {interpolateHoverValue} hidden={!showTimelineTooltip} {resourceTypes} />

  <!-- Timeline Context Menu. -->
  <TimelineContextMenu
    activityDirectivesMap={activityDirectivesMap || {}}
    bind:this={contextMenuComponent}
    {contextMenu}
    {hasUpdateDirectivePermission}
    {hasUpdateSimulationPermission}
    {maxTimeRange}
    on:collapseDiscreteTree={onCollapseDiscreteTree}
    on:deleteActivityDirective
    on:jumpToActivityDirective
    on:jumpToSpan
    on:hide={() => (contextMenu = null)}
    on:updateVerticalGuides
    on:viewTimeRangeReset={() => viewTimeRangeChanged(maxTimeRange)}
    on:viewTimeRangeChanged={event => viewTimeRangeChanged(event.detail)}
    {simulation}
    {simulationDataset}
    spansMap={spansMap || {}}
    {spanUtilityMaps}
    {plan}
    {planStartTimeYmd}
    verticalGuides={timeline?.verticalGuides ?? []}
    {xScaleView}
    {user}
    on:toggleActivityComposition
    on:editRow
    on:deleteRow
    on:moveRow={onMoveRow}
    on:duplicateRow
    on:insertRow
    on:insertSection={onInsertSection}
    on:setAllExpanded={onSetAllExpanded}
    on:editSection={onEditSection}
    on:deleteSection={onDeleteSection}
    on:duplicateSection
    on:moveSection={onMoveSection}
    on:addRowToSection={onAddRowToSection}
  />
</div>

<style>
  .rows {
    box-sizing: content-box;
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
    --timeline-divider-color: rgba(210, 210, 210, 1);
  }

  .timeline-time-row {
    background: white;
    border-bottom: 1px solid var(--timeline-divider-color);
    display: flex;
  }

  .timeline-histogram-container {
    padding: 4px 8px 4px 0px;
  }

  .timeline-padded-content {
    background: white;
    border-radius: 4px;
    position: relative;
  }

  :global(#dnd-action-dragged-el .row-root) {
    background: white;
    border: 1px solid var(--st-gray-40);
    box-shadow: var(--st-shadow-popover);
  }

  .new-row {
    align-items: center;
    background: white;
    border-bottom: 1px solid var(--st-gray-20);
    display: flex;
    justify-content: center;
    position: relative;
    width: 100%;
    z-index: 4;
  }

  .new-row button {
    color: var(--st-gray-70);
    font-size: 10px;
  }

  .timeline-section-wrapper,
  .timeline-row-wrapper {
    position: relative;
  }

  /* Editing a section outlines the whole block, header and rows, the way editing a row outlines
     that row. An overlay, so it sits above the rail and the row backgrounds. */
  .timeline-section-wrapper.active-section::after {
    border: 1px solid var(--st-utility-blue);
    bottom: 0;
    content: '';
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 0;
    /* Above the rail (5) and a selected child row's outline (6). */
    z-index: 7;
  }

  /* Left accent tying section rows to their section's color. An overlay rather than a border, so
     it paints above the row header background without shifting content out of alignment with the
     resize handle. */
  .timeline-row-in-section::before {
    background-color: var(--section-accent-color, var(--st-gray-30));
    bottom: 0;
    content: '';
    left: 0;
    pointer-events: none;
    position: absolute;
    /* Up 1px to cover the header's border-bottom, so the rail is continuous from band to rows. */
    top: -1px;
    width: 3px;
    /* Above the row header's own background, or the rail disappears behind it. */
    z-index: 5;
  }

  /* The row draws its own outline, but .row is a stacking context (position:relative + z-index),
     so that outline cannot paint over the rail on this wrapper. Only the left edge is hidden by
     the rail, so only the left edge is redrawn; a full border would double up on the other three. */
  .timeline-row-in-section.selected-row-outline::after {
    background: var(--st-utility-blue);
    bottom: 0;
    content: '';
    left: 0;
    pointer-events: none;
    position: absolute;
    top: 0;
    width: 1px;
    z-index: 6;
  }

  /* Indent only the row-header label (not the canvas) so section rows read as nested
     under the section header, while staying time-aligned with root rows. */
  .timeline-row-in-section :global(.row-header-left-column) {
    padding-left: 12px;
  }

  /* The tint stops at the row-header gutter. Carrying it across the plot area would put a colored
     surface under every line and x-range; the gutter tint plus the rail is cue enough. */
  .timeline-row-in-section :global(.row-header) {
    background-color: color-mix(in srgb, var(--section-accent-color) 10%, white);
  }

  /* The grey row divider cut a seam across a section's band, so inside one it takes a deeper step
     of the section's color instead. Auto-height rows use this border; manual rows drop it and
     render the .row-drag-handle-height resize bar below in its place, so both need the treatment. */
  .timeline-row-in-section :global(.row-root) {
    border-bottom-color: color-mix(in srgb, var(--section-accent-color) 35%, white);
  }

  /* Deliberately not row-shaped: shorter, and tinted only in the gutter. A full-width wash read
     as a real row that had failed to draw. */
  .section-empty {
    align-items: center;
    border-bottom: 1px solid var(--st-gray-20);
    display: flex;
    height: 30px;
    position: relative;
  }

  /* Carries the rail through, so an empty section still reads as part of its group. */
  .section-empty::before {
    background-color: var(--section-accent-color, var(--st-gray-30));
    bottom: 0;
    content: '';
    left: 0;
    pointer-events: none;
    position: absolute;
    top: -1px;
    width: 3px;
  }

  /* Sized to the row-header gutter and indented like a row name, so the dashed outline sits
     exactly where the row it is asking for would appear. */
  .section-empty-hint {
    background-color: color-mix(in srgb, var(--section-accent-color) 10%, white);
    border: 1px dashed color-mix(in srgb, var(--section-accent-color) 45%, var(--st-gray-40));
    border-radius: 4px;
    color: var(--st-gray-50);
    font-size: 11px;
    line-height: 20px;
    margin-left: 15px;
    text-align: center;
  }

  /* The whole strip is the drop target, so the whole strip lights up: the row lands here, not
     inside the dashed box. The rail keeps the section's color. */
  .timeline-section-wrapper :global(.section-empty.section-accepting-row) {
    background-color: color-mix(in srgb, var(--st-utility-blue) 6%, white);
  }

  /* The dashed outline resolves into a solid one, in the drop lines' blue. */
  .timeline-section-wrapper :global(.section-empty.section-accepting-row .section-empty-hint) {
    background-color: color-mix(in srgb, var(--st-utility-blue) 12%, white);
    border-color: var(--st-utility-blue);
    border-style: solid;
    color: var(--st-utility-blue);
  }

  .timeline-row-in-section :global(.row-drag-handle-height) {
    background-color: color-mix(in srgb, var(--section-accent-color) 35%, white);
  }

  /* The handle still darkens on hover so it reads as grabbable. */
  .timeline-row-in-section :global(.row-drag-handle-height:hover),
  .timeline-row-in-section :global(.row-drag-handle-height:active) {
    background-color: color-mix(in srgb, var(--section-accent-color) 60%, white);
  }

  /* :global throughout: these classes are added by the drag actions, not the markup. */
  :global(.timeline-row-wrapper.dragging),
  :global(.timeline-section-wrapper.dragging) {
    opacity: 0.5;
  }

  /* Both indicators use ::after. A row inside a section draws its accent rail with ::before, and
     a top indicator there replaced the rail - the rail vanished and no drop line appeared. */
  :global(.timeline-row-wrapper.drop-indicator-top)::after,
  :global(.timeline-row-wrapper.drop-indicator-bottom)::after {
    background: var(--st-utility-blue);
    content: '';
    height: 3px;
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    z-index: 10;
  }

  /* Centred on the item's edge, not inset within it, so "after this row" and "before the next
     one" - the same slot, reached from either side of the seam - draw the same line in the same
     place instead of two 3px apart. */
  :global(.timeline-row-wrapper.drop-indicator-top)::after {
    top: 0;
    transform: translateY(-50%);
  }

  :global(.timeline-row-wrapper.drop-indicator-bottom)::after {
    top: 100%;
    transform: translateY(-50%);
  }

  /* The first slot has no seam to share, and half a centred line there is clipped by the scroll
     container, so it sits fully inside instead. */
  .rows > :global(:first-child.drop-indicator-top)::after {
    transform: none;
  }

  /* The section's drag and drop classes land on .timeline-section-header-drop, the element the
     drop target is registered on, not on the outer wrapper. */
  :global(.timeline-section-header-drop) {
    position: sticky;
    top: 0;
    z-index: 5;
  }

  :global(.timeline-section-header-drop.drop-indicator-top)::after,
  :global(.timeline-section-header-drop.drop-indicator-bottom)::after {
    background: var(--st-utility-blue);
    content: '';
    height: 3px;
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    z-index: 10;
  }

  :global(.timeline-section-header-drop.drop-indicator-top)::after {
    top: 0;
    transform: translateY(-50%);
  }

  :global(.timeline-section-header-drop.drop-indicator-bottom)::after {
    top: 100%;
    transform: translateY(-50%);
  }

  /* Reordering is the blue line alone; a fill is reserved for the one drop that nests, a row into
     a section. The band is lightened rather than replaced by grey, which read as the section
     losing its color mid-drag and fought with the contrast foreground on its text and icons. */
  :global(.timeline-section-header-drop.section-accepting-row .section-header) {
    background-image: linear-gradient(rgb(255 255 255 / 24%), rgb(255 255 255 / 24%));
    box-shadow: inset 0 0 0 2px var(--st-utility-blue);
  }
</style>
