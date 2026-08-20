<svelte:options immutable={true} />

<script lang="ts">
  import {
    attachClosestEdge,
    extractClosestEdge,
    type Edge,
  } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
  import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
  import {
    draggable,
    dropTargetForElements,
    monitorForElements,
  } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
  import { DropdownMenu } from '@nasa-jpl/stellar-svelte';
  import ArrowLeftIcon from '@nasa-jpl/stellar/icons/arrow_left.svg?component';
  import CaretDownIcon from '@nasa-jpl/stellar/icons/caret_down.svg?component';
  import CaretRightIcon from '@nasa-jpl/stellar/icons/caret_right.svg?component';
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import DuplicateIcon from '@nasa-jpl/stellar/icons/duplicate.svg?component';
  import PenIcon from '@nasa-jpl/stellar/icons/pen.svg?component';
  import RemoveAllIcon from '@nasa-jpl/stellar/icons/remove_all.svg?component';
  import { Ellipsis, FolderPlus, FolderX, GripVertical, ListPlus } from 'lucide-svelte';
  import { onDestroy, onMount } from 'svelte';
  import {
    default as ExternalEventIcon,
    default as ExternalSourceIcon,
  } from '../../../assets/external-source-box.svg?component';
  import ActivityModeTextNoneIcon from '../../../assets/text-none.svg?component';
  import ActivityModeTextIcon from '../../../assets/text.svg?component';
  import ActivityModeCompactIcon from '../../../assets/timeline-activity-mode-compact.svg?component';
  import ActivityModeGroupedIcon from '../../../assets/timeline-activity-mode-grouped.svg?component';
  import DirectiveAndSpanIcon from '../../../assets/timeline-directive-and-span.svg?component';
  import DirectiveIcon from '../../../assets/timeline-directive.svg?component';
  import HierarchyModeDirectiveIcon from '../../../assets/timeline-hierarchy-mode-directive.svg?component';
  import HierarchyModeFlatIcon from '../../../assets/timeline-hierarchy-mode-flat.svg?component';
  import SpanIcon from '../../../assets/timeline-span.svg?component';
  import ActivityModeWidthIcon from '../../../assets/width.svg?component';
  import {
    ViewDefaultDiscreteOptions,
    ViewDefaultSectionColor,
    ViewSectionColorPresets,
  } from '../../../constants/view';
  import { ViewConstants } from '../../../enums/view';
  import { maxTimeRange, viewTimeRange } from '../../../stores/plan';
  import { plugins } from '../../../stores/plugins';
  import { yAxesWithScaleDomainsCache } from '../../../stores/simulation';
  import {
    selectedRowId,
    selectedSectionId,
    selectedTimelineId,
    view,
    viewAddSection,
    viewAddTimelineRow,
    viewDeleteSection,
    viewReorderTimelineItems,
    viewSetSelectedRow,
    viewSetSelectedSection,
    viewSetSelectedTimeline,
    viewUpdateRow,
    viewUpdateSection,
    viewUpdateTimeline,
  } from '../../../stores/views';
  import type { RadioButtonId } from '../../../types/radio-buttons';
  import type {
    ActivityLayer,
    ActivityOptions,
    Axis,
    ChartType,
    DiscreteOptions,
    ExternalEventLayer,
    ExternalEventOptions,
    HorizontalGuide,
    Layer,
    LineLayer,
    Row,
    Timeline,
    TimelineItemRef,
    TimelineSection,
    VerticalGuide,
    XRangeLayer,
  } from '../../../types/timeline';
  import type { ViewGridSection } from '../../../types/view';
  import effects from '../../../utilities/effects';
  import { getTarget } from '../../../utilities/generic';
  import { getDoyTime } from '../../../utilities/time';
  import {
    applyTimelineItemDrop,
    createHorizontalGuide,
    createTimelineActivityLayer,
    createTimelineExternalEventLayer,
    createTimelineLineLayer,
    createTimelineXRangeLayer,
    createVerticalGuide,
    createYAxis,
    getContrastingTextColor,
    getNextLayerID,
    getRenderableTimelineItems,
    isActivityLayer,
    isExternalEventLayer,
    isLineLayer,
    isXRangeLayer,
    resolveSectionDropEdge,
    toTimelineDropEdge,
  } from '../../../utilities/timeline';
  import { tooltip } from '../../../utilities/tooltip';
  import ColorPicker from '../../form/ColorPicker.svelte';
  import ColorPresetsPicker from '../../form/ColorPresetsPicker.svelte';
  import Input from '../../form/Input.svelte';
  import GridMenu from '../../menus/GridMenu.svelte';
  import ParameterUnits from '../../parameters/ParameterUnits.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import DatePicker from '../../ui/DatePicker/DatePicker.svelte';
  import Panel from '../../ui/Panel.svelte';
  import RadioButton from '../../ui/RadioButtons/RadioButton.svelte';
  import RadioButtons from '../../ui/RadioButtons/RadioButtons.svelte';
  import EditorSection from './TimelineEditor/EditorSection.svelte';
  import TimelineLayerEditor from './TimelineEditor/TimelineLayerEditor.svelte';
  import TimelineEditorYAxisSettings from './TimelineEditorYAxisSettings.svelte';

  export let gridSection: ViewGridSection;

  let horizontalGuides: HorizontalGuide[] = [];
  let editorDiv: HTMLDivElement;
  let editorWidth: number;
  let layers: Layer[] = [];
  let activityLayers: ActivityLayer[] = [];
  let resourceLayers: (LineLayer | XRangeLayer)[] = [];
  let externalEventLayers: ExternalEventLayer[] = [];
  let timelines: Timeline[] = [];
  let rowHasNonActivityChartLayer: boolean = false;
  let items: TimelineItemRef[] = [];
  let rows: Row[] = [];
  let sections: TimelineSection[] = [];
  let selectedTimeline: Timeline | undefined;
  let selectedRow: Row | undefined;
  let selectedSection: TimelineSection | undefined;
  let verticalGuides: VerticalGuide[] = [];
  let rowHasActivityLayer: boolean | ActivityLayer = false;
  let rowHasExternalEventLayer: boolean | ExternalEventLayer = false;
  let yAxes: Axis[] = [];

  type DragData = {
    itemId: number;
    itemType: 'section' | 'row';
    sourceSectionId: number | null; // null means root level
  };

  // A Set so an action's destroy() can drop its own entry. As an array it only ever grew, holding
  // every detached row alive.
  let cleanupFunctions: Set<() => void> = new Set();
  let monitorCleanup: (() => void) | null = null;

  $: selectedTimeline = $view?.definition.plan.timelines.find(t => t.id === $selectedTimelineId);
  // Never render straight from timeline.items: a stale ref collides with a reused id and throws
  // out of the keyed each below. The drop helper takes the healed order too, so a drop writes
  // it back.
  $: items = selectedTimeline ? getRenderableTimelineItems(selectedTimeline) : [];
  $: hierarchy = { items, sections };
  $: rows = selectedTimeline?.rows || [];
  $: sections = selectedTimeline?.sections || [];
  $: rowsById = new Map(rows.map(row => [row.id, row]));
  $: sectionsById = new Map(sections.map(section => [section.id, section]));

  $: timelines = $view?.definition.plan.timelines || [];
  $: verticalGuides = selectedTimeline?.verticalGuides || [];
  $: selectedRow = rows.find(row => row.id === $selectedRowId);
  $: selectedSection = sections.find(section => section.id === $selectedSectionId);
  $: horizontalGuides = selectedRow?.horizontalGuides || [];
  $: yAxes = selectedRow?.yAxes || [];
  $: layers = selectedRow?.layers || [];
  $: if (layers) {
    activityLayers = [];
    resourceLayers = [];
    externalEventLayers = [];
    layers.forEach(l => {
      if (isActivityLayer(l)) {
        activityLayers.push(l);
      } else if (isLineLayer(l) || isXRangeLayer(l)) {
        resourceLayers.push(l);
      } else if (isExternalEventLayer(l)) {
        externalEventLayers.push(l);
      }
    });
  }
  $: rowHasActivityLayer = !!selectedRow?.layers.find(isActivityLayer) || false;
  $: rowHasExternalEventLayer = selectedRow?.layers.find(isExternalEventLayer) || false;
  $: rowHasNonActivityChartLayer =
    !!selectedRow?.layers.find(layer => isLineLayer(layer) || isXRangeLayer(layer)) || false;
  $: if ((rowHasActivityLayer || rowHasExternalEventLayer) && selectedRow && !selectedRow.discreteOptions) {
    viewUpdateRow('discreteOptions', ViewDefaultDiscreteOptions);
  }
  $: discreteOptions = selectedRow?.discreteOptions || { ...ViewDefaultDiscreteOptions };

  function updateRowEvent(event: Event) {
    const { name, value } = getTarget(event);
    viewUpdateRow(name, value);
  }

  function updateRowMinHeight(event: Event) {
    const { name, value } = getTarget(event);
    if (typeof value === 'number' && !isNaN(value)) {
      if (value >= ViewConstants.MIN_ROW_HEIGHT) {
        viewUpdateRow(name, value);
      }
    }
  }

  function updateTimelineEvent(event: Event) {
    const { name, value } = getTarget(event);
    viewUpdateTimeline(name, value);
  }

  function updateTimelineMarginLeft(event: Event) {
    const { name, value } = getTarget(event);
    if (typeof value === 'number' && !isNaN(value)) {
      if (value >= ViewConstants.MIN_MARGIN_LEFT) {
        viewUpdateRow(name, value);
        viewUpdateTimeline(name, value);
      }
    }
  }

  function updateYAxisTickCount(event: Event, yAxis: Axis) {
    const { value: v } = getTarget(event);
    const numberValue = v as number;
    const value = isNaN(numberValue) ? null : numberValue;

    const newRowYAxes = yAxes.map(axis => {
      if (axis.id === yAxis.id) {
        axis.tickCount = value;
      }
      return axis;
    });
    viewUpdateRow('yAxes', newRowYAxes);
  }

  function handleNewYAxisClick() {
    const yAxis = createYAxis(timelines);
    yAxes = [...yAxes, yAxis];
    viewUpdateRow('yAxes', yAxes);
  }

  function handleRemoveAllYAxesClick() {
    effects.deleteTimelineYAxes();
  }

  function handleDeleteYAxisClick(yAxis: Axis) {
    const filteredYAxes = yAxes.filter(axis => axis.id !== yAxis.id);
    viewUpdateRow('yAxes', filteredYAxes);
  }

  // TODO move to a util?
  function createTimelineLayer(chartType: Layer['chartType']): Layer {
    switch (chartType) {
      case 'line':
        return createTimelineLineLayer(timelines, yAxes);
      case 'x-range':
        return createTimelineXRangeLayer(timelines, yAxes);
      case 'externalEvent':
        return createTimelineExternalEventLayer(timelines);
      default:
        return createTimelineActivityLayer(timelines);
    }
  }

  function handleNewLayerClick(chartType: Layer['chartType']) {
    let layer = createTimelineLayer(chartType);

    // Assign yAxisId to existing value or new axis
    if (chartType === 'line' || chartType === 'x-range') {
      if (yAxes.length > 0) {
        layer.yAxisId = yAxes[0].id;
      } else {
        handleNewYAxisClick();
        layer.yAxisId = yAxes[0].id;
      }
    }

    layers = [...layers, layer];
    viewUpdateRow('layers', layers);
  }

  function handleRemoveAllLayersClick(chartType: 'activity' | 'resource' | 'externalEvent') {
    effects.deleteTimelineLayers(layers, chartType);
  }

  function handleDeleteLayerClick(layer: Layer) {
    const filteredLayers = layers.filter(l => l.id !== layer.id);
    viewUpdateRow('layers', filteredLayers);
  }

  function handleDuplicateLayer(layer: Layer) {
    const duplicatedLayer = { ...structuredClone(layer), id: getNextLayerID(timelines) };
    viewUpdateRow('layers', [...layers, duplicatedLayer]);
  }

  function handleOptionRadioChange(event: CustomEvent<{ id: RadioButtonId }>, name: keyof DiscreteOptions) {
    const { id } = event.detail;
    viewUpdateRow('discreteOptions', { ...discreteOptions, [name]: id });
  }

  function handleActivityOptionRadioChange(event: CustomEvent<{ id: RadioButtonId }>, name: keyof ActivityOptions) {
    const { id } = event.detail;
    viewUpdateRow('discreteOptions', {
      ...discreteOptions,
      activityOptions: { ...discreteOptions.activityOptions, [name]: id },
    });
  }

  function handleExternalEventOptionRadioChange(
    event: CustomEvent<{ id: RadioButtonId }>,
    name: keyof ExternalEventOptions,
  ) {
    const { id } = event.detail;
    viewUpdateRow('discreteOptions', {
      ...discreteOptions,
      externalEventOptions: { ...discreteOptions.externalEventOptions, [name]: id },
    });
  }

  function addTimelineRow() {
    viewAddTimelineRow();
  }

  function addSection() {
    viewAddSection();
  }

  function updateSectionEvent(event: Event) {
    const { name, value } = getTarget(event);
    viewUpdateSection(name as keyof TimelineSection, value);
  }

  function removeAllTimelineRows() {
    if (!selectedTimeline) {
      return;
    }
    effects.deleteTimelineRows($selectedTimelineId);
  }

  function removeAllSections() {
    effects.deleteTimelineSections($selectedTimelineId);
  }

  function handleDrop(
    sourceData: DragData,
    targetItemId: number,
    targetItemType: 'section' | 'row',
    targetSectionId: number | null,
    edge: Edge | null,
  ) {
    if (!selectedTimeline) {
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

    viewReorderTimelineItems(next.items, $selectedTimelineId, next.sections);
  }

  /**
   * A press starts a drag only on an item's inert surface: its name, its grip, its blank space.
   * The whole item is the draggable, so without this a press inside one of the inputs or buttons
   * it contains dragged the item instead of doing what the control is for.
   */
  function isDragSurface(element: Element | null): boolean {
    return !!element && !element.closest('a, button, input, select, textarea, [contenteditable="true"]');
  }

  function makeDraggable(
    node: HTMLElement,
    params: { itemId: number; itemType: 'section' | 'row'; sectionId: number | null },
  ) {
    const cleanup = draggable({
      canDrag: ({ input }) => isDragSurface(document.elementFromPoint(input.clientX, input.clientY)),
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

  function makeDropTarget(
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
      getData: ({ element, input }) =>
        attachClosestEdge(
          { itemId: params.itemId, itemType: params.itemType, sectionId: params.sectionId },
          { allowedEdges: ['top', 'bottom'], element, input },
        ),
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

        handleDrop(sourceData, params.itemId, params.itemType, params.sectionId, edge);
      },
    });

    cleanupFunctions.add(cleanup);

    return {
      destroy() {
        cleanup();
        cleanupFunctions.delete(cleanup);
      },
      update(newParams: typeof params) {
        params = newParams;
      },
    };
  }

  /** Reads the geometry off the DOM; the decision itself lives in a tested utility. */
  function sectionDropEdge(element: Element, clientY: number, sourceData: DragData) {
    return resolveSectionDropEdge(element.getBoundingClientRect(), clientY, sourceData.itemType);
  }

  /**
   * A section header is both a reorder target (its edges) and a container that accepts rows
   * dropped onto its middle. Both have to live in a SINGLE drop target: two registered on one
   * element leaves only the last active, which swallowed the top edge and made the slot above a
   * leading section unreachable.
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
      node.classList.remove('section-accepting-row', 'drop-target-active');
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
        node.classList.add('drop-target-active');
        showFeedback(sectionDropEdge(self.element, location.current.input.clientY, source.data as DragData));
      },
      onDragLeave: clearFeedback,
      onDrop: ({ location, self, source }) => {
        const sourceData = source.data as DragData;
        const edge = sectionDropEdge(self.element, location.current.input.clientY, sourceData);
        clearFeedback();
        handleDrop(sourceData, params.sectionId, 'section', null, edge);
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
        handleDrop(source.data as DragData, params.sectionId, 'section', null, null);
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

  /**
   * Clears drag feedback classes left behind when a drag is cancelled and the target's own
   * callbacks do not fire. Scoped to this panel: the timeline uses the same class names.
   */
  function cleanupAllDragStates() {
    if (!editorDiv) {
      return;
    }

    ['dragging', 'drop-target-active', 'drop-indicator-top', 'drop-indicator-bottom', 'section-accepting-row'].forEach(
      cls => editorDiv.querySelectorAll(`.${cls}`).forEach(element => element.classList.remove(cls)),
    );
  }

  onMount(() => {
    monitorCleanup = monitorForElements({
      onDragStart: cleanupAllDragStates,
      onDrop: cleanupAllDragStates,
    });
  });

  onDestroy(() => {
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions.clear();
    if (monitorCleanup) {
      monitorCleanup();
      monitorCleanup = null;
    }
  });

  function makeYAxisDraggable(node: HTMLElement, params: { axisId: number }) {
    const cleanup = combine(
      draggable({
        canDrag: ({ input }) => isDragSurface(document.elementFromPoint(input.clientX, input.clientY)),
        element: node,
        getInitialData: () => ({ axisId: params.axisId, itemType: 'yAxis' }),
        onDragStart: () => node.classList.add('dragging'),
        onDrop: () => node.classList.remove('dragging'),
      }),
      dropTargetForElements({
        canDrop: ({ source }) => source.data.itemType === 'yAxis' && source.data.axisId !== params.axisId,
        element: node,
        getData: ({ element, input }) =>
          attachClosestEdge({ axisId: params.axisId }, { allowedEdges: ['top', 'bottom'], element, input }),
        onDrag: ({ self }) => updateDropIndicator(node, extractClosestEdge(self.data)),
        onDragLeave: () => removeDropIndicator(node),
        onDrop: ({ self, source }) => {
          removeDropIndicator(node);
          reorderYAxis(source.data.axisId as number, params.axisId, extractClosestEdge(self.data));
        },
      }),
    );

    cleanupFunctions.add(cleanup);

    return {
      destroy() {
        cleanup();
        cleanupFunctions.delete(cleanup);
      },
      update(newParams: { axisId: number }) {
        params = newParams;
      },
    };
  }

  function reorderYAxis(sourceId: number, targetId: number, edge: string | null) {
    const from = yAxes.findIndex(axis => axis.id === sourceId);
    const targetIndex = yAxes.findIndex(axis => axis.id === targetId);
    if (from < 0 || targetIndex < 0) {
      return;
    }

    const remaining = yAxes.filter(axis => axis.id !== sourceId);
    const insertAt = remaining.findIndex(axis => axis.id === targetId) + (edge === 'bottom' ? 1 : 0);
    const reordered = [...remaining.slice(0, insertAt), yAxes[from], ...remaining.slice(insertAt)];

    yAxes = reordered;
    viewUpdateRow('yAxes', reordered);
  }

  function handleDeleteVerticalGuideClick(verticalGuide: VerticalGuide) {
    const filteredVerticalGuides = verticalGuides.filter(guide => guide.id !== verticalGuide.id);
    viewUpdateTimeline('verticalGuides', filteredVerticalGuides, $selectedTimelineId);
  }

  function handleDeleteHorizontalGuideClick(horizontalGuide: HorizontalGuide) {
    const filteredHorizontalGuides = horizontalGuides.filter(guide => guide.id !== horizontalGuide.id);
    viewUpdateRow('horizontalGuides', filteredHorizontalGuides);
  }

  function updateVerticalGuideTimestamp(event: CustomEvent, verticalGuide: VerticalGuide) {
    const value = event.detail.value;
    const newVerticalGuides = verticalGuides.map(guide => {
      if (guide.id === verticalGuide.id) {
        guide.timestamp = value as string;
      }
      return guide;
    });
    viewUpdateTimeline('verticalGuides', newVerticalGuides, $selectedTimelineId);
  }

  function handleUpdateVerticalGuideLabel(event: Event, verticalGuide: VerticalGuide) {
    const { name, value } = getTarget(event);
    const newVerticalGuides = verticalGuides.map(guide => {
      if (guide.id === verticalGuide.id) {
        return {
          ...guide,
          label: {
            ...guide.label,
            [name]: value,
          },
        };
      }
      return guide;
    });
    viewUpdateTimeline('verticalGuides', newVerticalGuides, $selectedTimelineId);
  }

  function handleUpdateHorizontalGuideLabel(event: Event, horizontalGuide: HorizontalGuide) {
    const { name, value } = getTarget(event);
    const newHorizontalGuides = horizontalGuides.map(guide => {
      if (guide.id === horizontalGuide.id) {
        return {
          ...guide,
          label: {
            ...guide.label,
            [name]: value,
          },
        };
      }
      return guide;
    });
    viewUpdateRow('horizontalGuides', newHorizontalGuides);
  }

  function handleUpdateHorizontalGuideNumberValue(event: Event, horizontalGuide: HorizontalGuide) {
    const { name, value } = getTarget(event);
    if (isNaN(value as number)) {
      return;
    }
    const newHorizontalGuides = horizontalGuides.map(guide => {
      if (guide.id === horizontalGuide.id) {
        return {
          ...guide,
          [name]: value,
        };
      }
      return guide;
    });
    viewUpdateRow('horizontalGuides', newHorizontalGuides);
  }

  function handleUpdateLayerProperty(property: string, value: string | number | boolean | object | null, layer: Layer) {
    const newLayers = layers.map(l => {
      if (layer.id === l.id) {
        return {
          ...layer,
          [property]: value,
        };
      }
      return l;
    });
    viewUpdateRow('layers', newLayers);
  }

  function handleUpdateResourceLayerChartType(value: ChartType, layer: Layer) {
    const newLayers = layers.map(l => {
      if (layer.id === l.id) {
        if (isXRangeLayer(l) && value === 'line') {
          return createTimelineLineLayer(timelines, yAxes, { filter: l.filter, id: l.id, name: l.name });
        } else if (isLineLayer(l) && value === 'x-range') {
          return createTimelineXRangeLayer(timelines, yAxes, { filter: l.filter, id: l.id, name: l.name });
        }
      }
      return l;
    });

    viewUpdateRow('layers', newLayers);
  }

  function handleUpdateLayerColor(value: string, layer: Layer) {
    const newLayers = layers.map(l => {
      if (layer.id === l.id) {
        if (isActivityLayer(l)) {
          return { ...l, activityColor: value };
        } else if (isExternalEventLayer(l)) {
          return { ...l, externalEventColor: value };
        } else if (isLineLayer(l)) {
          return { ...l, lineColor: value };
        } else if (isXRangeLayer(l)) {
          return { ...l, colorScheme: value };
        }
      }
      return l;
    });
    viewUpdateRow('layers', newLayers);
  }

  function handleNewHorizontalGuideClick() {
    if (!selectedRow) {
      return;
    }
    const yAxesWithScaleDomains = $yAxesWithScaleDomainsCache[selectedRow.id];
    const newHorizontalGuide = createHorizontalGuide(timelines, yAxesWithScaleDomains);
    viewUpdateRow('horizontalGuides', [...horizontalGuides, newHorizontalGuide]);
  }

  function handleRemoveAllHorizontalGuidesClick() {
    effects.deleteTimelineHorizontalGuides();
  }

  function handleNewVerticalGuideClick() {
    if (typeof $selectedTimelineId !== 'number' || !$viewTimeRange) {
      return;
    }

    // Place the cursor in the middle of the timeline
    const centerTime = $viewTimeRange.start + ($viewTimeRange.end - $viewTimeRange.start) / 2;
    const centerDateDoy = getDoyTime(new Date(centerTime));

    const newVerticalGuide = createVerticalGuide(timelines, centerDateDoy);
    viewUpdateTimeline('verticalGuides', [...verticalGuides, newVerticalGuide], $selectedTimelineId);
  }

  function handleRemoveAllVerticalGuidesClick() {
    effects.deleteTimelineVerticalGuides($selectedTimelineId);
  }
</script>

<Panel padBody={false}>
  <svelte:fragment slot="header">
    <GridMenu {gridSection} title="Timeline Editor" />
  </svelte:fragment>

  <div
    slot="body"
    bind:this={editorDiv}
    bind:clientWidth={editorWidth}
    class="timeline-editor"
    class:compact={editorWidth < 360}
  >
    {#if selectedSection}
      <!-- Section editing -->
      <button
        on:click={() => {
          viewSetSelectedSection(null);
        }}
        class="st-button tertiary section-back-button"
      >
        <ArrowLeftIcon />
        Back to Timeline {$selectedTimelineId}
      </button>
      <div class="timeline-select-container">
        <select
          class="st-select w-full"
          data-type="number"
          name="sections"
          value={$selectedSectionId}
          on:change={event => {
            const { valueAsNumber: id } = getTarget(event);
            viewSetSelectedSection(id);
          }}
        >
          {#each sections as section (section.id)}
            <option value={section.id}>
              {section.name}
            </option>
          {/each}
        </select>
      </div>
      <!-- No Collapsed field: it is direct-manipulation state, with a chevron on the band and
           another in the list, and toggling it from a form dirties the view. -->
      <EditorSection item="Detail">
        <!-- Color leads, as it does on the band. Trailing the name stranded the swatch at the far
             right edge of a wide panel, away from everything else in the form. -->
        <CssGrid columns="auto 1fr" gap="8px" class="editor-section-grid">
          <Input>
            <label for="color">Color</label>
            <ColorPresetsPicker
              value={selectedSection.color ?? ViewDefaultSectionColor}
              presetColors={ViewSectionColorPresets}
              on:input={({ detail }) => viewUpdateSection('color', detail.value)}
            />
          </Input>
          <Input>
            <label for="section-name">Section Name</label>
            <input
              class="st-input w-full"
              id="section-name"
              name="name"
              autocomplete="off"
              type="string"
              value={selectedSection.name}
              on:input|stopPropagation={updateSectionEvent}
            />
          </Input>
        </CssGrid>
      </EditorSection>
      <!-- No heading: a legend reading "Section" over a button reading "Delete Section" said the
           same word twice. -->
      <EditorSection>
        <button
          class="st-button secondary w-full"
          on:click={() => {
            if (selectedSection) {
              viewDeleteSection(selectedSection.id, true);
            }
          }}
        >
          Delete Section (Keep Rows)
        </button>
      </EditorSection>
    {:else if !selectedRow}
      <!-- Select Timeline. -->
      <div class="timeline-select-container">
        <select
          class="st-select w-full"
          data-type="number"
          name="timelines"
          value={$selectedTimelineId}
          on:change={event => {
            const { valueAsNumber: id } = getTarget(event);
            viewSetSelectedTimeline(id);
          }}
        >
          {#each $view?.definition.plan.timelines ?? [] as timeline}
            <option value={timeline.id}>
              Timeline {timeline.id}
            </option>
          {/each}
        </select>
      </div>

      <!-- Timeline editing -->
      {#if !selectedTimeline}
        <fieldset class="editor-section">No timeline selected</fieldset>
      {:else}
        <EditorSection item="Margin">
          <CssGrid columns="1fr 1fr" gap="8px" class="editor-section-grid">
            <form on:submit={event => event.preventDefault()}>
              <Input>
                <label for="marginLeft">Margin Left</label>
                <input
                  min={ViewConstants.MIN_MARGIN_LEFT}
                  class="st-input w-full"
                  name="marginLeft"
                  id="marginLeft"
                  type="number"
                  value={selectedTimeline.marginLeft}
                  on:input|stopPropagation={updateTimelineMarginLeft}
                />
              </Input>
            </form>
            <Input>
              <label for="marginRight">Margin Right</label>
              <input
                min={0}
                class="st-input w-full"
                name="marginRight"
                id="marginRight"
                type="number"
                value={selectedTimeline.marginRight}
                on:input|stopPropagation={updateTimelineEvent}
              />
            </Input>
          </CssGrid>
        </EditorSection>

        <EditorSection
          creatable
          item="Vertical Guide"
          itemCount={verticalGuides.length}
          on:create={handleNewVerticalGuideClick}
          on:removeAll={handleRemoveAllVerticalGuidesClick}
        >
          {#if verticalGuides.length}
            <div class="editor-section-labeled-grid-container">
              <CssGrid columns="1fr 168px 24px 24px" gap="8px" class="editor-section-grid">
                <div>Label</div>
                <div>Date ({$plugins.time.primary.label})</div>
              </CssGrid>
              <div class="guides timeline-elements">
                {#each verticalGuides as verticalGuide (verticalGuide.id)}
                  <div class="guide timeline-element">
                    <CssGrid columns="1fr 168px 24px 24px" gap="8px" class="editor-section-grid">
                      <Input layout="stacked" class="editor-input">
                        <label for="text">Label</label>
                        <input
                          value={verticalGuide.label.text}
                          on:input={event => {
                            const { value } = getTarget(event);
                            const newVerticalGuides = verticalGuides.map(guide => {
                              if (guide.id === verticalGuide.id) {
                                guide.label.text = value?.toString() ?? '';
                              }
                              return guide;
                            });
                            viewUpdateTimeline('verticalGuides', newVerticalGuides, $selectedTimelineId);
                          }}
                          autocomplete="off"
                          class="st-input w-full"
                          name="text"
                          placeholder="Label"
                        />
                      </Input>
                      <Input layout="stacked" class="editor-input">
                        <DatePicker
                          name="timestamp"
                          minDate={new Date($maxTimeRange.start)}
                          maxDate={new Date($maxTimeRange.end)}
                          dateString={verticalGuide.timestamp}
                          on:change={event => updateVerticalGuideTimestamp(event, verticalGuide)}
                          on:keydown={event => updateVerticalGuideTimestamp(event, verticalGuide)}
                        />
                      </Input>
                      <div use:tooltip={{ content: 'Guide Color', placement: 'top' }}>
                        <ColorPicker
                          value={verticalGuide.label.color}
                          on:input={event => handleUpdateVerticalGuideLabel(event, verticalGuide)}
                          name="color"
                        />
                      </div>
                      <button
                        on:click={() => handleDeleteVerticalGuideClick(verticalGuide)}
                        use:tooltip={{ content: 'Delete Guide', placement: 'top' }}
                        class="st-button icon"
                      >
                        <CloseIcon />
                      </button>
                    </CssGrid>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </EditorSection>

        <fieldset class="editor-section editor-section-draggable rows-editor" aria-label="rows-editor">
          <div class="editor-section-header rows-editor-header flex flex-row justify-between">
            <div class="st-typography-medium flex items-center">Rows</div>
            <!-- Only the two additive actions stay inline. The bulk deletes are rare and
                 destructive, so they live behind the overflow menu rather than one click away. -->
            <div class="flex gap-2">
              <button
                aria-label="New Row"
                on:click|stopPropagation={addTimelineRow}
                use:tooltip={{ content: 'New Row', placement: 'top' }}
                class="st-button icon"
              >
                <ListPlus size={16} />
              </button>
              <button
                aria-label="New Section"
                on:click|stopPropagation={addSection}
                use:tooltip={{ content: 'New Section', placement: 'top' }}
                class="st-button icon"
              >
                <FolderPlus size={16} />
              </button>
              {#if rows.length > 0 || sections.length > 0}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild let:builder>
                    <button
                      aria-label="More Row Actions"
                      use:builder.action
                      {...builder}
                      use:tooltip={{ content: 'More Actions', placement: 'top' }}
                      class="st-button icon"
                    >
                      <Ellipsis size={16} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    {#if rows.length > 0}
                      <DropdownMenu.Item size="sm" class="flex gap-2" on:click={removeAllTimelineRows}>
                        <RemoveAllIcon />
                        Delete All Rows
                      </DropdownMenu.Item>
                    {/if}
                    {#if sections.length > 0}
                      <DropdownMenu.Item size="sm" class="flex gap-2" on:click={removeAllSections}>
                        <FolderX size={16} />
                        Delete All Sections
                      </DropdownMenu.Item>
                    {/if}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              {/if}
            </div>
          </div>

          {#if items.length > 0}
            <div class="timeline-hierarchy timeline-elements">
              {#each items as item (`${item.type}-${item.id}`)}
                {#if item.type === 'section'}
                  {@const section = sectionsById.get(item.id)}
                  {#if section}
                    <!-- The section's color drives both the flush-left rail and the tint behind
                         the whole block, so a colored section reads as one band. -->
                    <div
                      class="timeline-section-container"
                      style:--section-accent-color={section.color || ViewDefaultSectionColor}
                      style:--section-foreground={getContrastingTextColor(section.color || ViewDefaultSectionColor)}
                    >
                      <div
                        class="st-typography-body timeline-section timeline-element"
                        use:makeDraggable={{ itemId: section.id, itemType: 'section', sectionId: null }}
                        use:makeSectionDropTarget={{ sectionId: section.id }}
                      >
                        <span class="drag-icon">
                          <GripVertical size={16} />
                        </span>
                        <button
                          aria-expanded={!section.collapsed}
                          aria-label={section.collapsed ? 'Expand Section' : 'Collapse Section'}
                          use:tooltip={{
                            content: section.collapsed ? 'Expand Section' : 'Collapse Section',
                            placement: 'top',
                          }}
                          class="st-button icon section-chevron"
                          on:click|stopPropagation={() => {
                            viewUpdateSection('collapsed', !section.collapsed, section.id, $selectedTimelineId);
                          }}
                        >
                          {#if section.collapsed}
                            <CaretRightIcon />
                          {:else}
                            <CaretDownIcon />
                          {/if}
                        </button>
                        <span class="timeline-section-name">
                          {section.name}
                        </span>
                        {#if section.collapsed && section.rowIds.length > 0}
                          <span class="section-hidden-count st-typography-body">
                            {section.rowIds.length} hidden
                          </span>
                        {/if}
                        <div class="timeline-section-buttons item-actions">
                          <button
                            aria-label="Add Row to Section"
                            use:tooltip={{ content: 'Add Row to Section', placement: 'top' }}
                            class="st-button icon"
                            on:click|stopPropagation={() => {
                              viewAddTimelineRow($selectedTimelineId, false, section.id);
                            }}
                          >
                            <ListPlus size={16} />
                          </button>
                          <button
                            aria-label="Edit Section"
                            use:tooltip={{ content: 'Edit Section', placement: 'top' }}
                            class="st-button icon"
                            on:click={() => {
                              viewSetSelectedSection(section.id);
                            }}
                          >
                            <PenIcon />
                          </button>
                          <button
                            aria-label="Duplicate Section"
                            use:tooltip={{ content: 'Duplicate Section', placement: 'top' }}
                            class="st-button icon"
                            on:click|stopPropagation={() => {
                              if (selectedTimeline) {
                                effects.duplicateTimelineSection(section, selectedTimeline, timelines);
                              }
                            }}
                          >
                            <DuplicateIcon />
                          </button>
                          <button
                            aria-label="Delete Section"
                            use:tooltip={{ content: 'Delete Section', placement: 'top' }}
                            class="st-button icon"
                            on:click|stopPropagation={() => {
                              viewDeleteSection(section.id, true);
                            }}
                          >
                            <CloseIcon />
                          </button>
                        </div>
                      </div>
                      <!-- Collapsed state is shared with the timeline: folding here folds there. -->
                      {#if !section.collapsed}
                        <div class="section-rows timeline-elements">
                          <!-- An empty section rendered as nothing, which read as broken rather
                               than empty, and left nothing to drop the first row onto. -->
                          {#if section.rowIds.length === 0}
                            <div
                              class="section-empty st-typography-body"
                              use:makeEmptySectionDropTarget={{ sectionId: section.id }}
                            >
                              Drag a row here
                            </div>
                          {/if}
                          {#each section.rowIds as rowId (`section-${section.id}-row-${rowId}`)}
                            {@const row = rowsById.get(rowId)}
                            {#if row}
                              <div
                                class="st-typography-body timeline-row timeline-element timeline-row-in-section"
                                use:makeDraggable={{ itemId: row.id, itemType: 'row', sectionId: section.id }}
                                use:makeDropTarget={{ itemId: row.id, itemType: 'row', sectionId: section.id }}
                              >
                                <span class="drag-icon">
                                  <GripVertical size={16} />
                                </span>
                                <span class="chevron-spacer" />
                                <span class="timeline-row-name">
                                  {row.name}
                                </span>
                                <div class="timeline-row-buttons item-actions">
                                  <button
                                    use:tooltip={{ content: 'Edit Row', placement: 'top' }}
                                    class="st-button icon"
                                    on:click={() => {
                                      viewSetSelectedRow(row.id);
                                    }}
                                  >
                                    <PenIcon />
                                  </button>
                                  <button
                                    use:tooltip={{ content: 'Duplicate Row', placement: 'top' }}
                                    class="st-button icon"
                                    on:click={() => {
                                      if (selectedTimeline) {
                                        effects.duplicateTimelineRow(row, selectedTimeline, timelines);
                                      }
                                    }}
                                  >
                                    <DuplicateIcon />
                                  </button>
                                  <button
                                    use:tooltip={{ content: 'Delete Row', placement: 'top' }}
                                    class="st-button icon"
                                    on:click|stopPropagation={() => {
                                      effects.deleteTimelineRow(row, rows, $selectedTimelineId);
                                    }}
                                  >
                                    <CloseIcon />
                                  </button>
                                </div>
                              </div>
                            {/if}
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/if}
                {:else}
                  <!-- Root-level row -->
                  {@const row = rowsById.get(item.id)}
                  {#if row}
                    <div
                      class="st-typography-body timeline-row timeline-element"
                      use:makeDraggable={{ itemId: row.id, itemType: 'row', sectionId: null }}
                      use:makeDropTarget={{ itemId: row.id, itemType: 'row', sectionId: null }}
                    >
                      <span class="drag-icon">
                        <GripVertical size={16} />
                      </span>
                      <span class="chevron-spacer" />
                      <span class="timeline-row-name">
                        {row.name}
                      </span>
                      <div class="timeline-row-buttons item-actions">
                        <button
                          use:tooltip={{ content: 'Edit Row', placement: 'top' }}
                          class="st-button icon"
                          on:click={() => {
                            viewSetSelectedRow(row.id);
                          }}
                        >
                          <PenIcon />
                        </button>
                        <button
                          use:tooltip={{ content: 'Duplicate Row', placement: 'top' }}
                          class="st-button icon"
                          on:click={() => {
                            if (selectedTimeline) {
                              effects.duplicateTimelineRow(row, selectedTimeline, timelines);
                            }
                          }}
                        >
                          <DuplicateIcon />
                        </button>
                        <button
                          use:tooltip={{ content: 'Delete Row', placement: 'top' }}
                          class="st-button icon"
                          on:click|stopPropagation={() => {
                            effects.deleteTimelineRow(row, rows, $selectedTimelineId);
                          }}
                        >
                          <CloseIcon />
                        </button>
                      </div>
                    </div>
                  {/if}
                {/if}
              {/each}
            </div>
          {:else}
            <div class="empty-state st-typography-body">No rows or sections</div>
          {/if}
        </fieldset>
      {/if}
    {:else}
      <!-- Row editing -->
      <button
        on:click={() => {
          viewSetSelectedRow(null);
        }}
        class="st-button tertiary section-back-button"
      >
        <ArrowLeftIcon />
        Back to Timeline {$selectedTimelineId}
      </button>
      <div class="timeline-select-container">
        <select
          class="st-select w-full"
          data-type="number"
          name="rows"
          value={$selectedRowId}
          on:change={event => {
            const { valueAsNumber: id } = getTarget(event);
            viewSetSelectedRow(id);
          }}
        >
          {#each rows as row (row.id)}
            <option value={row.id}>
              {row.name}
            </option>
          {/each}
        </select>
      </div>
      <EditorSection item="Detail">
        <div style="display: grid">
          <Input>
            <label for="name">Row Name</label>
            <input
              class="st-input w-full"
              name="name"
              autocomplete="off"
              type="string"
              value={selectedRow.name}
              on:input|stopPropagation={updateRowEvent}
            />
          </Input>
        </div>
        <CssGrid columns="1fr 1fr" gap="8px" class="editor-section-grid">
          <form on:submit={event => event.preventDefault()}>
            <Input>
              <label for="marginLeft">Row Height</label>
              <input
                min={ViewConstants.MIN_ROW_HEIGHT}
                disabled={selectedRow.autoAdjustHeight}
                class="st-input w-full"
                name="height"
                type="number"
                value={selectedRow.height}
                on:input|stopPropagation={updateRowMinHeight}
              />
            </Input>
          </form>
          <Input>
            <label for="marginLeft">Resize Mode</label>
            <select
              class="st-select w-full"
              data-type="bool"
              name="autoAdjustHeight"
              value={selectedRow.autoAdjustHeight}
              on:change={event => {
                const { value } = getTarget(event);
                viewUpdateRow('autoAdjustHeight', value === 'true');
              }}
            >
              <option value={false}>Manual</option>
              <option value={true}>Auto</option>
            </select>
          </Input>
        </CssGrid>
      </EditorSection>

      {#if rowHasNonActivityChartLayer}
        <EditorSection
          creatable
          item="Horizontal Guide"
          itemCount={horizontalGuides.length}
          on:create={handleNewHorizontalGuideClick}
          on:removeAll={handleRemoveAllHorizontalGuidesClick}
        >
          {#if horizontalGuides.length}
            <div class="editor-section-labeled-grid-container">
              <CssGrid columns="1fr 1fr 1fr 24px 24px" gap="8px" class="editor-section-grid">
                <div>Label</div>
                <div>Y Value</div>
                <div>Y Axis</div>
              </CssGrid>
              <div class="guides timeline-elements">
                {#each horizontalGuides as horizontalGuide (horizontalGuide.id)}
                  <div class="guide timeline-element">
                    <CssGrid columns="1fr 1fr 1fr 24px 24px" gap="8px" class="editor-section-grid">
                      <Input layout="stacked" class="editor-input">
                        <label for="text">Label</label>
                        <input
                          value={horizontalGuide.label.text}
                          on:input={event => handleUpdateHorizontalGuideLabel(event, horizontalGuide)}
                          autocomplete="off"
                          class="st-input w-full"
                          name="text"
                        />
                      </Input>
                      <Input layout="stacked" class="editor-input">
                        <label for="y">Y Value</label>
                        <input
                          value={horizontalGuide.y}
                          on:input={event => handleUpdateHorizontalGuideNumberValue(event, horizontalGuide)}
                          autocomplete="off"
                          class="st-input w-full"
                          name="y"
                          type="number"
                        />
                      </Input>
                      <Input layout="stacked" class="editor-input">
                        <label for="yAxisId">Y Axis</label>
                        <select
                          on:input={event => handleUpdateHorizontalGuideNumberValue(event, horizontalGuide)}
                          class="st-select w-full"
                          data-type="number"
                          name="yAxisId"
                        >
                          {#each yAxes as axis}
                            <option value={axis.id} selected={horizontalGuide.yAxisId === axis.id}>
                              {axis.label.text}
                            </option>
                          {/each}
                        </select>
                      </Input>
                      <div use:tooltip={{ content: 'Guide Color', placement: 'top' }}>
                        <ColorPicker
                          value={horizontalGuide.label.color}
                          on:input={event => handleUpdateHorizontalGuideLabel(event, horizontalGuide)}
                          name="color"
                        />
                      </div>
                      <button
                        on:click={() => handleDeleteHorizontalGuideClick(horizontalGuide)}
                        use:tooltip={{ content: 'Delete Guide', placement: 'top' }}
                        class="st-button icon"
                      >
                        <CloseIcon />
                      </button>
                    </CssGrid>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </EditorSection>
      {/if}
      {#if rowHasActivityLayer || rowHasExternalEventLayer}
        <EditorSection
          item="Layer Option"
          on:create={handleNewHorizontalGuideClick}
          on:removeAll={handleRemoveAllHorizontalGuidesClick}
        >
          <form on:submit={event => event.preventDefault()} style="flex: 1">
            <Input layout="inline" class="editor-input">
              <label for="text">Height</label>
              <input
                min={12}
                autocomplete="off"
                class="st-input w-full"
                name="text"
                type="number"
                value={discreteOptions.height}
                on:input={event => {
                  const { value } = getTarget(event);
                  if (typeof value === 'number' && !isNaN(value)) {
                    if (value >= 12) {
                      viewUpdateRow('discreteOptions', { ...discreteOptions, height: value });
                    }
                  }
                }}
              />
              <ParameterUnits unit="px" slot="right" />
            </Input>
          </form>
          <Input layout="inline" class="editor-input">
            <label for="activity-composition">Display</label>
            <RadioButtons
              selectedButtonId={discreteOptions.displayMode}
              on:select-radio-button={event => {
                handleOptionRadioChange(event, 'displayMode');
              }}
            >
              <RadioButton
                use={[[tooltip, { content: 'Group activities by type in collapsible rows', placement: 'top' }]]}
                id="grouped"
              >
                <div class="radio-button-icon">
                  <ActivityModeGroupedIcon />
                  <span class="timeline-editor-responsive-label">Grouped</span>
                </div>
              </RadioButton>
              <RadioButton
                use={[[tooltip, { content: 'Pack activities into a single row', placement: 'top' }]]}
                id="compact"
              >
                <div class="radio-button-icon">
                  <ActivityModeCompactIcon />
                  <span class="timeline-editor-responsive-label">Compact</span>
                </div>
              </RadioButton>
            </RadioButtons>
          </Input>
          <Input layout="inline" class="editor-input">
            <label for="activity-composition">Labels</label>
            <RadioButtons
              selectedButtonId={discreteOptions.labelVisibility}
              on:select-radio-button={event => handleOptionRadioChange(event, 'labelVisibility')}
            >
              <RadioButton use={[[tooltip, { content: 'Always show labels', placement: 'top' }]]} id="on">
                <div class="radio-button-icon">
                  <ActivityModeTextIcon />
                  <span class="timeline-editor-responsive-label">On</span>
                </div>
              </RadioButton>
              <RadioButton use={[[tooltip, { content: 'Never show labels', placement: 'top' }]]} id="off">
                <div class="radio-button-icon">
                  <ActivityModeTextNoneIcon />
                  <span class="timeline-editor-responsive-label">Off</span>
                </div>
              </RadioButton>
              <RadioButton
                use={[[tooltip, { content: 'Show labels that do not overlap', placement: 'top' }]]}
                id="auto"
              >
                <div class="radio-button-icon">
                  <ActivityModeWidthIcon />
                  <span class="timeline-editor-responsive-label">Auto</span>
                </div>
              </RadioButton>
            </RadioButtons>
          </Input>
          {#if rowHasActivityLayer}
            <div class="editor-section-header activity-options">
              <div class="st-typography-label">Activity Options</div>
            </div>
            <Input layout="inline" class="editor-input">
              <label for="activity-composition">Show</label>
              <RadioButtons
                id="activity-composition"
                selectedButtonId={discreteOptions?.activityOptions?.composition}
                on:select-radio-button={event => handleActivityOptionRadioChange(event, 'composition')}
              >
                <RadioButton use={[[tooltip, { content: 'Only show directives', placement: 'top' }]]} id="directives">
                  <div class="radio-button-icon">
                    <DirectiveIcon /><span class="timeline-editor-responsive-label">Directives</span>
                  </div>
                </RadioButton>
                <RadioButton use={[[tooltip, { content: 'Only show simulated', placement: 'top' }]]} id="spans">
                  <div class="radio-button-icon">
                    <SpanIcon />
                    <span class="timeline-editor-responsive-label">Simulated</span>
                  </div>
                </RadioButton>
                <RadioButton
                  use={[[tooltip, { content: 'Show directives and simulated activities', placement: 'top' }]]}
                  id="both"
                >
                  <div class="radio-button-icon">
                    <DirectiveAndSpanIcon />
                    <span class="timeline-editor-responsive-label">Both</span>
                  </div>
                </RadioButton>
              </RadioButtons>
            </Input>
          {/if}
          {#if rowHasActivityLayer && discreteOptions.displayMode === 'grouped'}
            <Input layout="inline" class="editor-input">
              <label for="activity-composition">Hierarchy</label>
              <RadioButtons
                selectedButtonId={discreteOptions?.activityOptions?.hierarchyMode}
                on:select-radio-button={event => handleActivityOptionRadioChange(event, 'hierarchyMode')}
              >
                <RadioButton
                  use={[[tooltip, { content: 'Group starting with directives', placement: 'top' }]]}
                  id="directive"
                >
                  <div class="radio-button-icon">
                    <HierarchyModeDirectiveIcon />
                    <span class="timeline-editor-responsive-label">By Directive</span>
                  </div>
                </RadioButton>
                <RadioButton
                  use={[
                    [
                      tooltip,
                      { content: 'Group starting with directives and spans regardless of depth', placement: 'top' },
                    ],
                  ]}
                  id="flat"
                >
                  <div class="radio-button-icon">
                    <HierarchyModeFlatIcon />
                    <span class="timeline-editor-responsive-label">Flat</span>
                  </div>
                </RadioButton>
              </RadioButtons>
            </Input>
          {/if}
          {#if rowHasExternalEventLayer && discreteOptions.displayMode === 'grouped'}
            <div class="editor-section-header external-event-options">
              <div class="st-typography-label">External Event Options</div>
            </div>
            <Input layout="inline" class="editor-input">
              <label for="activity-composition">Group By</label>
              <RadioButtons
                selectedButtonId={discreteOptions?.externalEventOptions?.groupBy}
                on:select-radio-button={event => handleExternalEventOptionRadioChange(event, 'groupBy')}
              >
                <RadioButton
                  use={[[tooltip, { content: 'Group according to external source', placement: 'top' }]]}
                  id="source_key"
                >
                  <div class="radio-button-icon">
                    <ExternalSourceIcon />
                    <span class="timeline-editor-responsive-label">By Source</span>
                  </div>
                </RadioButton>
                <RadioButton
                  use={[[tooltip, { content: 'Group according to event type', placement: 'top' }]]}
                  id="event_type_name"
                >
                  <div class="radio-button-icon">
                    <ExternalEventIcon />
                    <span class="timeline-editor-responsive-label">By Event Type</span>
                  </div>
                </RadioButton>
              </RadioButtons>
            </Input>
          {/if}
        </EditorSection>
      {/if}
      <!-- TODO perhaps separate out each section into a mini editor? -->

      {#if yAxes.length > 0 || rowHasNonActivityChartLayer}
        <EditorSection
          isDragContainer
          creatable
          item="Y Axis"
          itemPlural="Y Axes"
          itemCount={yAxes.length}
          on:create={handleNewYAxisClick}
          on:removeAll={handleRemoveAllYAxesClick}
        >
          {#if yAxes.length}
            <div class="editor-section-labeled-grid-container">
              <CssGrid columns="1fr 56px 24px 24px" gap="8px" class="editor-section-grid-labels" padding="0px 16px">
                <div>Name</div>
                <div>Ticks</div>
              </CssGrid>
              <div class="timeline-rows timeline-elements">
                {#each yAxes as yAxis (yAxis.id)}
                  <div class="timeline-y-axis timeline-element" use:makeYAxisDraggable={{ axisId: yAxis.id }}>
                    <CssGrid columns="1fr 56px 24px 24px" gap="8px" class="editor-section-grid">
                      <span class="drag-icon">
                        <GripVertical size={16} />
                      </span>
                      <div class="w-full">
                        <Input layout="stacked" class="editor-input">
                          <label for="text">Y Axis</label>
                          <input
                            autocomplete="off"
                            class="st-input w-full"
                            name="text"
                            type="string"
                            value={yAxis.label.text}
                            on:input={event => {
                              const { value } = getTarget(event);
                              const newRowYAxes = yAxes.map(axis => {
                                if (axis.id === yAxis.id) {
                                  axis.label.text = value?.toString() ?? '';
                                }
                                return axis;
                              });
                              viewUpdateRow('yAxes', newRowYAxes);
                            }}
                          />
                        </Input>
                      </div>
                      <Input layout="stacked" class="editor-input">
                        <label for="tickCount">Ticks</label>
                        <input
                          class="st-input w-full"
                          name="tickCount"
                          type="number"
                          min="0"
                          value={yAxis.tickCount}
                          on:input={event => updateYAxisTickCount(event, yAxis)}
                        />
                      </Input>
                      <TimelineEditorYAxisSettings {yAxis} {yAxes} on:delete={() => handleDeleteYAxisClick(yAxis)} />
                      <button
                        on:click={() => handleDeleteYAxisClick(yAxis)}
                        use:tooltip={{ content: 'Delete Y Axis', placement: 'top' }}
                        class="st-button icon"
                      >
                        <CloseIcon />
                      </button>
                    </CssGrid>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div />
          {/if}
        </EditorSection>
      {/if}
      <EditorSection
        creatable
        item="Activity Layer"
        itemCount={activityLayers.length}
        on:create={() => handleNewLayerClick('activity')}
        on:removeAll={() => handleRemoveAllLayersClick('activity')}
      >
        {#if activityLayers.length}
          <div class="timeline-layers timeline-elements">
            {#each activityLayers as layer (layer.id)}
              <TimelineLayerEditor
                {yAxes}
                {layer}
                on:updateLayer={({ detail: { property, value } }) => handleUpdateLayerProperty(property, value, layer)}
                on:colorChange={({ detail: { color } }) => handleUpdateLayerColor(color, layer)}
                on:remove={() => handleDeleteLayerClick(layer)}
                on:duplicate={() => handleDuplicateLayer(layer)}
                on:filterChange={({ detail: { filter } }) =>
                  handleUpdateLayerProperty('filter', { activity: filter }, layer)}
              />
            {/each}
          </div>
        {/if}
      </EditorSection>
      <EditorSection
        creatable
        item="Resource Layer"
        itemCount={resourceLayers.length}
        on:create={() => handleNewLayerClick('line')}
        on:removeAll={() => handleRemoveAllLayersClick('resource')}
      >
        {#if resourceLayers.length}
          <!-- TODO bug when dragging something into a different draggable area -->
          <div class="timeline-layers timeline-elements">
            {#each resourceLayers as layer (layer.id)}
              <TimelineLayerEditor
                {layer}
                {yAxes}
                on:updateLayer={({ detail: { property, value } }) => handleUpdateLayerProperty(property, value, layer)}
                on:updateChartType={({ detail: chartType }) => handleUpdateResourceLayerChartType(chartType, layer)}
                on:colorChange={({ detail: { color } }) => handleUpdateLayerColor(color, layer)}
                on:remove={() => handleDeleteLayerClick(layer)}
                on:duplicate={() => handleDuplicateLayer(layer)}
                on:filterChange={({ detail: { filter } }) =>
                  handleUpdateLayerProperty('filter', { resource: filter }, layer)}
              />
              <!-- <TimelineEditorLayerSection
                on:handleUpdateResourceLayerChartType={event => handleUpdateResourceLayerChartType(event.detail.value, layer)}
                on:handleUpdateLayerFilter={event => handleUpdateLayerFilter(event.detail.values, layer)}
                on:handleUpdateLayerProperty={event =>
                  handleUpdateLayerProperty(event.detail.name, event.detail.value, layer)}
                on:handleUpdateLayerColorScheme={event => handleUpdateLayerColorScheme(event.detail.value, layer)}
                on:handleDeleteLayerClick={() => handleDeleteLayerClick(layer)}
                {layer}
                {yAxes}
              /> -->
            {/each}
          </div>
        {/if}
      </EditorSection>
      <EditorSection
        creatable
        item="Event Layer"
        itemCount={externalEventLayers.length}
        on:create={() => handleNewLayerClick('externalEvent')}
        on:removeAll={() => handleRemoveAllLayersClick('externalEvent')}
      >
        {#if externalEventLayers.length}
          <div class="timeline-layers timeline-elements">
            {#each externalEventLayers as layer (layer.id)}
              <TimelineLayerEditor
                {layer}
                on:updateLayer={({ detail: { property, value } }) => handleUpdateLayerProperty(property, value, layer)}
                on:rename={({ detail: { name } }) => handleUpdateLayerProperty('name', name, layer)}
                on:colorChange={({ detail: { color } }) => handleUpdateLayerColor(color, layer)}
                on:remove={() => handleDeleteLayerClick(layer)}
                on:duplicate={() => handleDuplicateLayer(layer)}
                on:filterChange={({ detail: { filter } }) =>
                  handleUpdateLayerProperty('filter', { externalEvent: filter }, layer)}
              />
            {/each}
          </div>
        {/if}
      </EditorSection>
    {/if}
  </div>
</Panel>

<style>
  .activity-options {
    border-top: 1px solid var(--st-gray-20);
    padding-top: 16px;
  }

  .external-event-options {
    border-top: 1px solid var(--st-gray-20);
    padding-top: 16px;
  }

  .timeline-editor {
    display: flex;
    flex-direction: column;
  }

  /* The global fieldset reset applies px-4, and the override that cancels it is scoped to
     EditorSection - so this hand-rolled fieldset floated 16px inset. Rows and sections run edge to
     edge instead, letting a section's tint and rail reach the panel border. The header keeps the
     padding so its label stays aligned with the other section titles. */
  .rows-editor {
    padding-left: 0;
    padding-right: 0;
  }

  .rows-editor-header {
    padding: 0 16px;
  }

  .rows-editor-header .st-button {
    color: var(--st-gray-50);
  }

  .timeline-select-container {
    border-bottom: 1px solid var(--st-gray-20);
    padding: 16px 8px;
  }

  .timeline-row .st-button.icon,
  .guide .st-button.icon,
  .timeline-y-axis .st-button.icon,
  :global(.timeline-editor-layer-settings.st-button.icon),
  :global(.timeline-editor-axis-settings.st-button.icon) {
    color: var(--st-gray-50);
  }

  .editor-section-labeled-grid-container {
    display: grid;
    gap: 8px;
  }

  .editor-section-labeled-grid-container {
    gap: 4px;
  }

  .timeline-elements {
    display: block;
    outline: none !important;
    overflow-x: hidden;
    overflow-y: auto;
    padding-bottom: 16px;
  }

  :global(.editor-section-grid form) {
    display: grid;
  }

  :global(.editor-section-grid) {
    align-items: center;
    flex: 1;
    position: relative;
    width: 100%;
  }

  :global(.editor-section-grid-labels > *) {
    min-width: 40px;
  }

  /* Rows and sections share one left-to-right order: rail gutter, drag handle, chevron lane,
     name. The handle and chevron stay in flow rather than sitting over the padding, so nothing
     overlaps the flush-left rail.

     height alone did not hold: as flex items of the column .timeline-hierarchy, a hovered row
     collapsed to its 24px content height. flex-shrink stops the list compressing rows, and
     min-height pins the used height. */
  .timeline-row {
    align-items: center;
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    height: 32px;
    min-height: 32px;
    overflow: hidden;
    padding: 0 16px 0 8px;
    position: relative;
  }

  /* Default handle treatment, shared with the y-axis list: hidden until hover and absolutely
     positioned so it does not take a cell in that list's grid. */
  .drag-icon {
    color: var(--st-gray-50);
    display: none;
    margin-left: -16px;
    margin-top: 0px;
    position: absolute;
  }

  /* The rows/sections list opts into persistent handles, in flow as each row's first item, so the
     color rail stays flush left with nothing over it. Scoped so the y-axis grid keeps the overlay. */
  .timeline-hierarchy .drag-icon {
    align-items: center;
    color: var(--st-gray-30);
    display: flex;
    flex-shrink: 0;
    margin-left: 0;
    position: static;
  }

  .timeline-hierarchy .timeline-element:hover .drag-icon {
    color: var(--st-gray-50);
  }

  /* The grab/grabbing pair the timeline uses on its row and section headers, on the same two
     surfaces: the handle and the name. */
  .timeline-hierarchy .drag-icon,
  .timeline-row-name,
  .timeline-section-name {
    cursor: grab;
  }

  .timeline-hierarchy .drag-icon:active,
  .timeline-row-name:active,
  .timeline-section-name:active,
  :global(.timeline-hierarchy .dragging) .drag-icon,
  :global(.timeline-hierarchy .dragging) .timeline-row-name,
  :global(.timeline-hierarchy .dragging) .timeline-section-name {
    cursor: grabbing;
  }

  /* Root-level rows reserve the section chevron's width so every name lands on one left edge. */
  .chevron-spacer {
    flex-shrink: 0;
    width: 16px;
  }

  /* Root-level hover fill. Rows inside a section override this with a wash of the section
     color further down. :focus-within is included so a keyboard user tabbing to a row's
     actions still gets an opaque backing behind them. */
  .timeline-row:hover,
  .timeline-row:active,
  .timeline-row:focus-within,
  .timeline-section:hover,
  .timeline-section:active,
  .timeline-section:focus-within {
    background: var(--st-gray-10);
  }

  .timeline-row-name,
  .timeline-section-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .timeline-row-buttons {
    display: flex;
  }

  /* Same left structure as .timeline-row so the two align. */
  .timeline-section {
    align-items: center;
    display: flex;
    flex-shrink: 0;
    gap: 4px;
    height: 32px;
    min-height: 32px;
    overflow: hidden;
    padding: 0 16px 0 5px;
    position: relative;
  }

  .timeline-section .section-chevron {
    color: var(--st-gray-70);
    flex-shrink: 0;
    height: 24px;
    padding: 0;
    width: 16px;
  }

  .timeline-section-name {
    font-weight: 500;
  }

  .section-hidden-count {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }

  .timeline-section-buttons {
    display: flex;
  }

  /* The rail is flush to the panel edge and everything else, handles included, starts after its
     3px gutter, so nothing is drawn on top of the color. The hairlines keep stacked sections
     reading as distinct blocks rather than one tinted run. */
  .timeline-section-container {
    border-bottom: 1px solid var(--st-gray-20);
    border-top: 1px solid var(--st-gray-20);
    display: flex;
    flex-direction: column;
    padding-left: 3px;
    position: relative;
  }

  /* Adjacent sections share a single hairline instead of stacking two. */
  .timeline-section-container + .timeline-section-container {
    border-top: none;
  }

  /* The band is the section color at full strength, and everything on it takes the
     contrast-picked foreground rather than a fixed grey, so it stays legible at any color. */
  .timeline-section-container .timeline-section {
    background-color: var(--section-accent-color);
    color: var(--section-foreground);
  }

  .timeline-section-container .timeline-section:hover,
  .timeline-section-container .timeline-section:active,
  .timeline-section-container .timeline-section:focus-within {
    background-color: color-mix(in srgb, var(--section-accent-color) 88%, black);
  }

  /* The handle has its own color further down (.timeline-hierarchy .drag-icon), out-specified
     here. Chevron and action buttons are handled on .timeline-section .st-button.icon below. */
  .timeline-section-container .timeline-section .drag-icon,
  .timeline-section-container .timeline-section:hover .drag-icon,
  .timeline-section-container .timeline-section .section-hidden-count {
    color: var(--section-foreground);
  }

  /* The default grey button hover reads as a hole punched in a saturated band. A wash of the
     band's own foreground works on light and dark bands alike. */
  .timeline-section-container .timeline-section :global(.st-button.icon:hover) {
    background: color-mix(in srgb, var(--section-foreground) 18%, transparent);
  }

  /* Rows keep a light wash of the same color. At a 10% mix the lightness barely moves across
     hues, so row names - and, on the timeline, plotted data - stay readable without normalizing. */
  .timeline-section-container {
    background-color: color-mix(in srgb, var(--section-accent-color) 10%, white);
  }

  .timeline-section-container .timeline-row:hover,
  .timeline-section-container .timeline-row:active,
  .timeline-section-container .timeline-row:focus-within {
    background-color: color-mix(in srgb, var(--section-accent-color) 18%, white);
  }

  /* One unbroken rail from the section header down past its last row, so the whole group reads
     as a single band. */
  .timeline-section-container::before {
    background-color: var(--section-accent-color, var(--st-gray-30));
    bottom: 0;
    content: '';
    left: 0;
    position: absolute;
    top: 0;
    width: 3px;
  }

  .section-empty {
    border: 1px dashed color-mix(in srgb, var(--section-accent-color) 45%, var(--st-gray-40));
    border-radius: 4px;
    color: var(--st-gray-50);
    margin: 4px 16px 4px 17px;
    padding: 6px 8px;
    text-align: center;
  }

  /* The dashed outline resolves into a solid one, in the drop lines' blue. Anchored on
     .section-rows: the timeline renders its own .section-empty, and an unanchored :global rule
     reached into it. */
  .section-rows :global(.section-empty.section-accepting-row) {
    background-color: color-mix(in srgb, var(--st-utility-blue) 8%, white);
    border-color: var(--st-utility-blue);
    border-style: solid;
    color: var(--st-utility-blue);
  }

  /* .section-rows also carries .timeline-elements, whose 16px padding-bottom is meant for the
     outer list and left a dead gap under every section. */
  .section-rows {
    min-height: 0;
    outline: none !important;
    padding-bottom: 0;
    padding-left: 0;
  }

  /* Nested rows share the section's left padding so their handles line up with the section's own.
     The nesting indent moves onto the name, by widening the chevron lane; indenting the whole row
     would stair-step the handles. */
  .timeline-row-in-section {
    padding-left: 5px;
  }

  .timeline-row-in-section .chevron-spacer {
    width: 28px;
  }

  .timeline-hierarchy {
    display: flex;
    flex-direction: column;
    padding-top: 8px;
  }

  .empty-state {
    color: var(--st-gray-50);
    padding: 16px;
    text-align: center;
  }

  /* The band's controls take its contrast foreground. Set on this selector rather than
     out-specified from elsewhere: Svelte does not scope the contents of :global(), so a
     :global(.st-button.icon) rule scores lower and loses to this one. */
  .timeline-section .st-button.icon {
    color: var(--section-foreground);
  }

  .timeline-element:hover .drag-icon,
  :global(.timeline-element.dragging) .drag-icon {
    display: flex;
  }

  /* Per-item actions stay hidden until the item is hovered, so a long list reads as names and
     structure rather than a grid of icons. They stay in the DOM and in the tab order, with
     :focus-within revealing them on the way through.

     Out of flow, so they never take width from the title: a name keeps the whole row and only
     ellipses when it genuinely outruns it. `background: inherit` picks up whichever fill the row
     is using, so the icons sit on an opaque strip rather than on top of the text. */
  .item-actions {
    align-items: center;
    background: inherit;
    bottom: 0;
    display: flex;
    opacity: 0;
    padding-left: 8px;
    position: absolute;
    right: 16px;
    top: 0;
    transition: opacity 100ms ease-in-out;
  }

  .timeline-element:hover .item-actions,
  .timeline-element:focus-within .item-actions,
  :global(.timeline-element.dragging) .item-actions {
    opacity: 1;
  }

  /* Same reveal, no fade, for anyone who prefers reduced motion. */
  @media (prefers-reduced-motion: reduce) {
    .item-actions {
      transition: none;
    }
  }

  .timeline-layers {
    display: flex;
    flex-direction: column;
  }

  /* position: relative anchors the drop line below. */
  .timeline-y-axis {
    padding: 4px 16px;
    position: relative;
  }

  .timeline-y-axis .drag-icon {
    cursor: grab;
  }

  .timeline-y-axis .drag-icon:active,
  :global(.timeline-y-axis.dragging) .drag-icon {
    cursor: grabbing;
  }

  .guides {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .guide,
  .timeline-y-axis {
    align-items: flex-end;
    display: flex;
  }

  .guide :global(.date-picker) {
    flex: 1;
    min-width: 168px;
  }

  :global(.input.input-stacked.editor-input) {
    display: grid;
    min-width: 40px;
    width: auto;
  }

  :global(.input.input-stacked.editor-input label) {
    display: none;
  }

  :global(.input.input-inline.editor-input) {
    grid-template-columns: 60px auto;
    padding: 0;
  }

  .section-back-button {
    border-radius: 0;
    flex-shrink: 0;
    gap: 8px;
    height: 32px;
    justify-content: flex-start;
  }

  .radio-button-icon {
    display: flex;
    gap: 4px;
  }

  .compact .timeline-editor-responsive-label {
    display: none;
  }

  /* :global throughout: these classes are added by the drag actions, not the markup. */
  :global(.timeline-row.dragging),
  :global(.timeline-section.dragging),
  :global(.timeline-y-axis.dragging) {
    opacity: 0.5;
  }

  /* A line between items rather than an inset shadow inside one. The shadow read as a border
     on the row itself, which stacked with the section's own outline and rail. */
  :global(.timeline-row.drop-indicator-top)::after,
  :global(.timeline-row.drop-indicator-bottom)::after,
  :global(.timeline-section.drop-indicator-top)::after,
  :global(.timeline-section.drop-indicator-bottom)::after,
  :global(.timeline-y-axis.drop-indicator-top)::after,
  :global(.timeline-y-axis.drop-indicator-bottom)::after {
    background: var(--st-utility-blue);
    content: '';
    height: 2px;
    left: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    z-index: 10;
  }

  /* Centred on the item's edge, not inset within it, so "after this one" and "before the next" -
     the same slot, reached from either side of the seam - draw one line in one place. */
  :global(.timeline-row.drop-indicator-top)::after,
  :global(.timeline-section.drop-indicator-top)::after,
  :global(.timeline-y-axis.drop-indicator-top)::after {
    top: 0;
    transform: translateY(-50%);
  }

  :global(.timeline-row.drop-indicator-bottom)::after,
  :global(.timeline-section.drop-indicator-bottom)::after,
  :global(.timeline-y-axis.drop-indicator-bottom)::after {
    top: 100%;
    transform: translateY(-50%);
  }

  /* The y-axis list has no top padding to hang a centred line in, and its first slot has no seam
     to share anyway, so that line sits fully inside. The rows list is padded and needs no
     exception. */
  .timeline-rows > :global(:first-child.drop-indicator-top)::after {
    transform: none;
  }

  /* Reordering is communicated by the line alone. The fill is reserved for the one drop that
     actually nests - a row landing inside a section. The band keeps its own color and is
     lightened rather than replaced by grey, which read as the section losing its color mid-drag
     and fought with the contrast foreground painted on its text and icons. */
  :global(.timeline-section.section-accepting-row) {
    background-image: linear-gradient(rgb(255 255 255 / 24%), rgb(255 255 255 / 24%));
    box-shadow: inset 0 0 0 2px var(--st-utility-blue);
  }
</style>
