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
  import { directiveBuilderIsVisible, updateDirectiveBuilder } from '../../stores/directiveBuilder';
  import { planDerivationGroupLinks } from '../../stores/external-source';
  import { plugins } from '../../stores/plugins';
  import {
    viewAddSection,
    viewAddTimelineRow,
    viewDeleteSection,
    viewReorderTimelineItems,
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
  import { MAX_CANVAS_SIZE, TimelineInteractionMode, TimelineLockStatus, getXScale } from '../../utilities/timeline';
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
    mouseDown: MouseDown;
    toggleRowExpansion: { expanded: boolean; rowId: number };
    updateRowHeight: {
      newHeight: number;
      rowId: number;
      wasAutoAdjusted?: boolean;
    };
    updateRows: Row[];
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
  let rowDragMoveDisabled = true;
  let rowsMaxHeight: number = 600;
  let rows: Row[] = [];
  let sections: TimelineSection[] = [];
  let items: TimelineItemRef[] = [];
  let sectionDragDisabled = true;
  let rowHeaderDragHandleWidthPx: number = 2;

  // Pragmatic DND state
  type DragData = {
    itemId: number;
    itemType: 'section' | 'row';
    sourceSectionId: number | null; // null means root level
  };
  let dragOverState: Map<string, { edge: Edge | null; isOver: boolean }> = new Map();
  let cleanupFunctions: (() => void)[] = [];
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
  $: items = timeline?.items || [];
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

  // Native dragend handler as a fallback for cleanup
  // Pragmatic DND callbacks may not fire during rapid/cancelled drags
  function handleNativeDragEnd() {
    cleanupAllDragStates();
  }

  onDestroy(() => {
    if (removeDPRChangeListener !== null) {
      removeDPRChangeListener();
    }
    // Cleanup pragmatic DND
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions = [];
    if (monitorCleanup) {
      monitorCleanup();
      monitorCleanup = null;
    }
    // Remove native drag event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('dragend', handleNativeDragEnd);
      window.removeEventListener('drop', handleNativeDragEnd);
    }
    // Clean up any lingering drag states
    cleanupAllDragStates();
  });

  onMount(() => {
    detectDPRChange();

    // Add native drag event listeners as fallback cleanup mechanisms
    // These catch cases where pragmatic DND callbacks don't fire (rapid/cancelled drags)
    window.addEventListener('dragend', handleNativeDragEnd);
    window.addEventListener('drop', handleNativeDragEnd);

    // Setup global monitor for pragmatic DND
    monitorCleanup = monitorForElements({
      onDragStart: () => {
        // Clean up any stuck states from previous drags before starting a new one
        cleanupAllDragStates();
      },
      onDrop: () => {
        // Reset all drag over states and clean up any lingering CSS classes
        cleanupAllDragStates();
      },
    });
  });

  // Clean up all DND-related CSS classes from the DOM
  function cleanupAllDragStates() {
    dragOverState = new Map();

    // Guard against SSR/HMR where document may not be available
    if (typeof document === 'undefined') {
      return;
    }

    // Remove all drag-related classes that might be stuck on elements
    const dragClasses = [
      'dragging',
      'drop-target-active',
      'drop-indicator-top',
      'drop-indicator-bottom',
      'section-accepting-row',
    ];

    dragClasses.forEach(cls => {
      document.querySelectorAll(`.${cls}`).forEach(el => {
        el.classList.remove(cls);
      });
    });
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
    // Open the timeline editor panel on the right and select the section.
    viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'TimelineEditorPanel' } });
    viewSetSelectedSection(event.detail.id);
  }

  function onContextMenuToggleSectionCollapsed(event: CustomEvent<TimelineSection>) {
    const section = event.detail;
    viewUpdateSection('collapsed', !section.collapsed, section.id, timeline?.id);
  }

  function onAddRowToSection(event: CustomEvent<TimelineSection>) {
    viewAddTimelineRow(timeline?.id, false, event.detail.id);
  }

  function onDeleteSection(event: CustomEvent<TimelineSection>) {
    viewDeleteSection(event.detail.id, true, timeline?.id);
  }

  function onAddSection() {
    viewAddSection(timeline?.id);
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

  // Pragmatic DND: Handle drop of timeline items (sections, rows, and hierarchical moves)
  function handleTimelineItemDrop(
    sourceData: DragData,
    targetItemId: number,
    targetItemType: 'section' | 'row',
    targetSectionId: number | null,
    edge: Edge | null,
  ) {
    const { itemId: sourceItemId, itemType: sourceItemType, sourceSectionId } = sourceData;

    // Don't allow dropping a section into another section
    if (sourceItemType === 'section' && targetItemType === 'row' && targetSectionId !== null) {
      return;
    }

    // If dropping on itself, do nothing
    if (sourceItemId === targetItemId && sourceItemType === targetItemType) {
      return;
    }

    // If dropping a row that's already in the target section onto that section's header, do nothing
    if (targetItemType === 'section' && sourceItemType === 'row' && edge === null && sourceSectionId === targetItemId) {
      return;
    }

    if (!timeline) {
      return;
    }

    let newItems = [...items];
    let newSections = sections.map(s => ({ ...s, rowIds: [...s.rowIds] }));

    // Remove source from its current location
    if (sourceItemType === 'row') {
      if (sourceSectionId !== null) {
        // Remove from section
        const sourceSection = newSections.find(s => s.id === sourceSectionId);
        if (sourceSection) {
          sourceSection.rowIds = sourceSection.rowIds.filter(id => id !== sourceItemId);
        }
      } else {
        // Remove from root level
        newItems = newItems.filter(item => !(item.type === 'row' && item.id === sourceItemId));
      }
    } else {
      // Remove section from root level
      newItems = newItems.filter(item => !(item.type === 'section' && item.id === sourceItemId));
    }

    // Determine where to insert
    if (targetItemType === 'section' && sourceItemType === 'row' && edge === null) {
      // Dropping a row INTO a section (not at an edge)
      const targetSection = newSections.find(s => s.id === targetItemId);
      if (targetSection && !targetSection.rowIds.includes(sourceItemId)) {
        targetSection.rowIds.push(sourceItemId);
      }
    } else if (targetSectionId !== null && sourceItemType === 'row') {
      // Dropping row within a section (reordering or moving between sections)
      const targetSection = newSections.find(s => s.id === targetSectionId);
      if (targetSection) {
        const targetIndex = targetSection.rowIds.findIndex(id => id === targetItemId);
        if (targetIndex !== -1) {
          const insertIndex = edge === 'bottom' ? targetIndex + 1 : targetIndex;
          targetSection.rowIds.splice(insertIndex, 0, sourceItemId);
        } else {
          targetSection.rowIds.push(sourceItemId);
        }
      }
    } else {
      // Dropping at root level
      const targetIndex = newItems.findIndex(item => item.type === targetItemType && item.id === targetItemId);
      const insertIndex = edge === 'bottom' ? targetIndex + 1 : targetIndex;
      newItems.splice(insertIndex, 0, { id: sourceItemId, type: sourceItemType });
    }

    // Update the view with new items and sections
    viewReorderTimelineItems(newItems, timeline.id, newSections);
  }

  // Check if an element is a valid drag handle for rows
  function isRowDragHandle(element: Element | null): boolean {
    if (!element) {
      return false;
    }
    // Check if the element or any of its ancestors is a drag handle or row title
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

  // Svelte action to make a timeline item draggable
  // Only allows dragging from the drag handle or row title
  function makeTimelineItemDraggable(
    node: HTMLElement,
    params: { itemId: number; itemType: 'section' | 'row'; sectionId: number | null },
  ) {
    const cleanup = draggable({
      canDrag: ({ input }) => {
        // For sections, check if dragging from the section drag handle
        if (params.itemType === 'section') {
          const target = document.elementFromPoint(input.clientX, input.clientY);
          return isRowDragHandle(target);
        }
        // For rows, only allow dragging from the drag handle or row title
        const target = document.elementFromPoint(input.clientX, input.clientY);
        return isRowDragHandle(target);
      },
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

    cleanupFunctions.push(cleanup);

    return {
      destroy() {
        cleanup();
      },
      update(newParams: { itemId: number; itemType: 'section' | 'row'; sectionId: number | null }) {
        params = newParams;
      },
    };
  }

  // Svelte action to make a timeline item a drop target
  function makeTimelineItemDropTarget(
    node: HTMLElement,
    params: { itemId: number; itemType: 'section' | 'row'; sectionId: number | null },
  ) {
    const key = `${params.itemType}-${params.itemId}-${params.sectionId ?? 'root'}`;
    dragOverState.set(key, { edge: null, isOver: false });

    const cleanup = dropTargetForElements({
      canDrop: ({ source }) => {
        const sourceData = source.data as DragData;
        // Only accept drags from our row/section draggables (not activity drags, etc.)
        if (sourceData.itemType !== 'section' && sourceData.itemType !== 'row') {
          return false;
        }
        // Don't allow dropping sections into sections
        if (sourceData.itemType === 'section' && params.sectionId !== null) {
          return false;
        }
        // Don't allow dropping on self
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
        dragOverState.set(key, { edge, isOver: true });
        dragOverState = new Map(dragOverState);
        updateDropIndicator(node, edge);
      },
      onDragEnter: ({ self }) => {
        const edge = extractClosestEdge(self.data);
        dragOverState.set(key, { edge, isOver: true });
        dragOverState = new Map(dragOverState);
        node.classList.add('drop-target-active');
        updateDropIndicator(node, edge);
      },
      onDragLeave: () => {
        dragOverState.set(key, { edge: null, isOver: false });
        dragOverState = new Map(dragOverState);
        node.classList.remove('drop-target-active');
        removeDropIndicator(node);
      },
      onDrop: ({ self, source }) => {
        const sourceData = source.data as DragData;
        const edge = extractClosestEdge(self.data);
        dragOverState.set(key, { edge: null, isOver: false });
        dragOverState = new Map(dragOverState);
        node.classList.remove('drop-target-active');
        removeDropIndicator(node);

        handleTimelineItemDrop(sourceData, params.itemId, params.itemType, params.sectionId, edge);
      },
    });

    cleanupFunctions.push(cleanup);

    return {
      destroy() {
        cleanup();
        dragOverState.delete(key);
      },
      update(newParams: { itemId: number; itemType: 'section' | 'row'; sectionId: number | null }) {
        params = newParams;
      },
    };
  }

  // Svelte action for section header that can accept rows dropped onto it
  function makeSectionHeaderDropTarget(node: HTMLElement, params: { sectionId: number }) {
    const key = `section-header-${params.sectionId}`;
    dragOverState.set(key, { edge: null, isOver: false });

    const cleanup = dropTargetForElements({
      canDrop: ({ source }) => {
        const sourceData = source.data as DragData;
        // Only accept rows, not sections
        if (sourceData.itemType !== 'row') {
          return false;
        }
        // Don't accept if the row is already in this section
        if (sourceData.sourceSectionId === params.sectionId) {
          return false;
        }
        return true;
      },
      element: node,
      getData: ({ element, input }) => {
        return attachClosestEdge(
          {
            isSection: true,
            sectionId: params.sectionId,
          },
          {
            allowedEdges: ['top', 'bottom'],
            element,
            input,
          },
        );
      },
      onDrag: ({ self }) => {
        const edge = extractClosestEdge(self.data);
        dragOverState.set(key, { edge, isOver: true });
        dragOverState = new Map(dragOverState);
        updateDropIndicator(node, edge);
      },
      onDragEnter: ({ self }) => {
        const edge = extractClosestEdge(self.data);
        dragOverState.set(key, { edge, isOver: true });
        dragOverState = new Map(dragOverState);
        node.classList.add('section-accepting-row');
        updateDropIndicator(node, edge);
      },
      onDragLeave: () => {
        dragOverState.set(key, { edge: null, isOver: false });
        dragOverState = new Map(dragOverState);
        node.classList.remove('section-accepting-row');
        removeDropIndicator(node);
      },
      onDrop: ({ source }) => {
        const sourceData = source.data as DragData;
        dragOverState.set(key, { edge: null, isOver: false });
        dragOverState = new Map(dragOverState);
        node.classList.remove('section-accepting-row');
        removeDropIndicator(node);

        // Move row into this section (edge=null means add to section, not reorder)
        handleTimelineItemDrop(sourceData, params.sectionId, 'section', null, null);
      },
    });

    cleanupFunctions.push(cleanup);

    return {
      destroy() {
        cleanup();
        dragOverState.delete(key);
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
      <!-- Render with sections support and drag-and-drop -->
      <div class="rows" style="max-height: {rowsMaxHeight}px" on:wheel={handleScroll}>
        {#each items as item, i (`${item.type}-${item.id}`)}
          {#if item.type === 'section'}
            {@const section = sectionsById.get(item.id)}
            {#if section}
              <div
                class="timeline-section-wrapper"
                use:makeTimelineItemDraggable={{ itemId: section.id, itemType: 'section', sectionId: null }}
                use:makeTimelineItemDropTarget={{ itemId: section.id, itemType: 'section', sectionId: null }}
                use:makeSectionHeaderDropTarget={{ sectionId: section.id }}
              >
                <TimelineSectionHeader
                  {section}
                  width={(timeline?.marginLeft ?? 0) + drawWidth}
                  dragDisabled={sectionDragDisabled}
                  on:toggleCollapsed={onToggleSectionCollapsed}
                  on:mouseDownSectionMove={onMouseDownSectionMove}
                  on:mouseUpSectionMove={onMouseUpSectionMove}
                  on:contextMenu={e => onSectionContextMenu(e, section)}
                />
                {#if !section.collapsed}
                  {#each section.rowIds as rowId, rowIndex (`section-${section.id}-row-${rowId}`)}
                    {@const row = rowsById.get(rowId)}
                    {#if row}
                      <div
                        class="timeline-row-wrapper timeline-row-in-section"
                        style:--section-accent-color={section.color || null}
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
    on:addSection={onAddSection}
    on:editSection={onEditSection}
    on:deleteSection={onDeleteSection}
    on:addRowToSection={onAddRowToSection}
    on:toggleSectionCollapsed={onContextMenuToggleSectionCollapsed}
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

  /* Left accent tying section rows to their section's color. Drawn as an overlay
     pseudo-element (not a border) so it stays visible above the row header background
     and doesn't shift content out of alignment with the row-header resize handle. */
  .timeline-row-in-section::before {
    background-color: var(--section-accent-color, var(--st-gray-30));
    bottom: 0;
    content: '';
    left: 0;
    pointer-events: none;
    position: absolute;
    /* Extend up 1px to cover the section header's border-bottom so the accent strip
       reads as one continuous rail from the section band down through its rows. */
    top: -1px;
    width: 3px;
    z-index: 5;
  }

  /* Indent only the row-header label (not the canvas) so section rows read as nested
     under the section header, while staying time-aligned with root rows. */
  .timeline-row-in-section :global(.row-header-left-column) {
    padding-left: 12px;
  }

  /* Pragmatic DND styles - using :global because classes are added dynamically via JS */
  :global(.timeline-row-wrapper.dragging),
  :global(.timeline-section-wrapper.dragging) {
    opacity: 0.5;
  }

  /* Drop indicator using pseudo-element to ensure it appears above child elements */
  :global(.timeline-row-wrapper.drop-indicator-top)::before {
    background: var(--st-utility-blue);
    content: '';
    height: 3px;
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 0;
    z-index: 10;
  }

  :global(.timeline-row-wrapper.drop-indicator-bottom)::after {
    background: var(--st-utility-blue);
    bottom: 0;
    content: '';
    height: 3px;
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    z-index: 10;
  }

  /* Section drop indicators are applied to the section-header inside, not the wrapper */
  :global(.timeline-section-wrapper.drop-indicator-top .section-header)::before {
    background: var(--st-utility-blue);
    content: '';
    height: 3px;
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 0;
    z-index: 10;
  }

  :global(.timeline-section-wrapper.drop-indicator-bottom .section-header)::after {
    background: var(--st-utility-blue);
    bottom: 0;
    content: '';
    height: 3px;
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    z-index: 10;
  }

  :global(.timeline-row-wrapper.drop-target-active),
  :global(.timeline-section-wrapper.drop-target-active) {
    background: var(--st-gray-15);
  }

  /* Section header needs special handling because it has its own background */
  :global(.timeline-section-wrapper.drop-target-active .section-header),
  :global(.timeline-section-wrapper.section-accepting-row .section-header) {
    background: var(--st-gray-20);
    box-shadow: inset 0 0 0 2px var(--st-utility-blue);
  }
</style>
