<svelte:options immutable={true} />

<script lang="ts">
  import PenIcon from '@nasa-jpl/stellar/icons/pen.svg?component';
  import type { ScaleTime } from 'd3-scale';
  import { select } from 'd3-selection';
  import { pick } from 'lodash-es';
  import { createEventDispatcher } from 'svelte';
  import { selectedRow, viewSetSelectedRow, viewTogglePanel } from '../../stores/views';
  import type {
    ActivityDirective,
    ActivityDirectiveId,
    ActivityDirectivesByView,
    ActivityDirectivesMap,
  } from '../../types/activity';
  import type { ConstraintViolation } from '../../types/constraint';
  import type { Resource, SimulationDataset, Span, SpanId, SpanUtilityMaps, SpansMap } from '../../types/simulation';
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
  import type { TimelineLockStatus } from '../../utilities/timeline';
  import { tooltip } from '../../utilities/tooltip';
  import ConstraintViolations from './ConstraintViolations.svelte';
  import LayerActivity from './LayerActivity.svelte';
  import LayerGaps from './LayerGaps.svelte';
  import LayerLine from './LayerLine.svelte';
  import LayerXRange from './LayerXRange.svelte';
  import RowDragHandleHeight from './RowDragHandleHeight.svelte';
  import RowHeader from './RowHeader.svelte';
  import RowHorizontalGuides from './RowHorizontalGuides.svelte';
  import RowXAxisTicks from './RowXAxisTicks.svelte';
  import RowYAxes from './RowYAxes.svelte';
  import TimelineViewDirectiveControls from './TimelineViewDirectiveControls.svelte';

  export let activityDirectivesByView: ActivityDirectivesByView = { byLayerId: {}, byTimelineId: {} };
  export let activityDirectivesMap: ActivityDirectivesMap = {};
  export let autoAdjustHeight: boolean = false;
  export let constraintViolations: ConstraintViolation[] = [];
  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let expanded: boolean = true;
  export let horizontalGuides: HorizontalGuide[] = [];
  export let id: number;
  export let layers: Layer[] = [];
  export let name: string = '';
  export let marginLeft: number = 50;
  export let planEndTimeDoy: string;
  export let planId: number;
  export let planStartTimeYmd: string;
  export let resourcesByViewLayerId: Record<number, Resource[]> = {};
  export let rowDragMoveDisabled = true;
  export let selectedActivityDirectiveId: ActivityDirectiveId | null = null;
  export let selectedSpanId: SpanId | null = null;
  export let showDirectives: boolean = true;
  export let simulationDataset: SimulationDataset | null = null;
  export let spanUtilityMaps: SpanUtilityMaps;
  export let spansMap: SpansMap = {};
  export let timelineLockStatus: TimelineLockStatus;
  export let viewTimeRange: TimeRange = { end: 0, start: 0 };
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let xTicksView: XAxisTick[] = [];
  export let yAxes: Axis[] = [];

  const dispatch = createEventDispatcher();

  let blur: FocusEvent;
  let contextmenu: MouseEvent;
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
  let mouseOverConstraintViolations: ConstraintViolation[] = []; // For this row.
  let mouseOverPointsByLayer: Record<number, Point[]> = {};
  let mouseOverSpansByLayer: Record<number, Span[]> = {};
  let mouseOverGapsByLayer: Record<number, Point[]> = {};
  let overlaySvg: SVGElement;

  $: onDragenter(dragenter);
  $: onDragleave(dragleave);
  $: onDragover(dragover);
  $: onDrop(drop);

  $: heightsByLayer = pick(
    heightsByLayer,
    layers.map(({ id }) => id),
  );
  $: overlaySvgSelection = select(overlaySvg);
  $: rowClasses = classNames('row', { 'row-collapsed': !expanded });
  $: hasActivityLayer = !!layers.find(layer => layer.chartType === 'activity');

  function onDragenter(e: DragEvent | undefined): void {
    if (hasActivityLayer && e && overlaySvgSelection) {
      const { offsetX } = e;
      overlaySvgSelection
        .append('line')
        .attr('class', 'activity-drag-guide')
        .attr('x1', offsetX)
        .attr('y1', 0)
        .attr('x2', offsetX)
        .attr('y2', drawHeight)
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
    if (hasActivityLayer && e && overlaySvgSelection) {
      const { offsetX } = e;
      overlaySvgSelection.select('.activity-drag-guide').remove();
      const unixEpochTime = xScaleView.invert(offsetX).getTime();
      const start_time = getDoyTime(new Date(unixEpochTime));
      const activityTypeName = e.dataTransfer.getData('activityTypeName');
      effects.createActivityDirective({}, start_time, activityTypeName, activityTypeName, [], {});
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
    mouseOverConstraintViolations = detail?.constraintViolations ?? mouseOverConstraintViolations;
    mouseOverPointsByLayer[layerId] = detail?.points ?? [];
    mouseOverSpansByLayer[layerId] = detail?.spans ?? [];
    mouseOverGapsByLayer[layerId] = detail?.gaps ?? mouseOverGapsByLayer[layerId] ?? [];

    const activityDirectives = Object.values(mouseOverActivityDirectivesByLayer).flat();
    const constraintViolations = mouseOverConstraintViolations;
    const points = Object.values(mouseOverPointsByLayer).flat();
    const spans = Object.values(mouseOverSpansByLayer).flat();
    const gaps = Object.values(mouseOverGapsByLayer).flat();

    dispatch('mouseOver', { ...detail, activityDirectives, constraintViolations, gaps, points, spans });
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
      if (newHeight !== drawHeight) {
        dispatch('updateRowHeight', { newHeight, rowId: id, wasAutoAdjusted: true });
      }
    }
  }

  function onEditRow() {
    // Open the timeline editor panel on the right.
    viewTogglePanel({ state: true, type: 'right', update: { rightComponentTop: 'TimelineEditorPanel' } });

    // Set row to edit.
    viewSetSelectedRow(id);
  }
</script>

<div class="row-root" class:active-row={$selectedRow ? $selectedRow.id === id : false}>
  <!-- Row Header. -->
  <RowHeader {expanded} rowId={id} title={name} {rowDragMoveDisabled} on:mouseDownRowMove on:toggleRowExpansion>
    <div slot="right" class="row-controls">
      {#if hasActivityLayer}
        <TimelineViewDirectiveControls
          directivesVisible={showDirectives}
          offTooltipContent="Show Directives on this Timeline Row"
          onTooltipContent="Hide Directives on this Timeline Row"
          useBorder={false}
          on:toggleDirectiveVisibility
        />
      {/if}
      <button
        use:tooltip={{ content: 'Edit Row', placement: 'top' }}
        class="st-button icon row-edit-button"
        on:click={onEditRow}
      >
        <PenIcon />
      </button>
    </div>
  </RowHeader>

  <div class={rowClasses} id={`row-${id}`} style="height: {drawHeight}px;">
    <!-- Overlay for Pointer Events. -->
    <svg
      bind:this={overlaySvg}
      class="overlay"
      style="transform: translate({marginLeft}px, 0px); width: {drawWidth}px"
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
    />

    <!-- SVG Elements. -->
    <svg>
      <g transform="translate({marginLeft}, 0)">
        {#if drawWidth > 0}
          <RowXAxisTicks {drawHeight} {xScaleView} {xTicksView} />
          <ConstraintViolations
            {constraintViolations}
            {drawHeight}
            {drawWidth}
            {mousemove}
            {mouseout}
            {viewTimeRange}
            {xScaleView}
            on:mouseOver={onMouseOver}
          />
          <RowYAxes {drawHeight} {yAxes} />
          <RowHorizontalGuides {drawHeight} {drawWidth} {horizontalGuides} {yAxes} />
        {/if}
      </g>
    </svg>

    <!-- Layers of Canvas Visualizations. -->
    <div class="layers" style="transform: translate({marginLeft}px, 0px); width: {drawWidth}px">
      {#each layers as layer (layer.id)}
        {#if layer.chartType === 'activity'}
          <LayerActivity
            {...layer}
            activityDirectives={activityDirectivesByView?.byLayerId[layer.id] ?? []}
            {activityDirectivesMap}
            {showDirectives}
            {blur}
            {contextmenu}
            {drawHeight}
            {drawWidth}
            filter={layer.filter.activity}
            {focus}
            {mousedown}
            {mousemove}
            {mouseout}
            {mouseup}
            {planEndTimeDoy}
            {planId}
            {planStartTimeYmd}
            {selectedActivityDirectiveId}
            {selectedSpanId}
            {simulationDataset}
            {spanUtilityMaps}
            {spansMap}
            {timelineLockStatus}
            {viewTimeRange}
            {xScaleView}
            on:contextMenu
            on:deleteActivityDirective
            on:mouseDown={onMouseDown}
            on:mouseOver={onMouseOver}
            on:updateRowHeight={onUpdateRowHeightLayer}
          />
        {/if}
        {#if layer.chartType === 'line' || layer.chartType === 'x-range'}
          <LayerGaps
            {...layer}
            {drawHeight}
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
            {drawHeight}
            {drawWidth}
            filter={layer.filter.resource}
            {mousemove}
            {mouseout}
            resources={resourcesByViewLayerId[layer.id] ?? []}
            {viewTimeRange}
            {xScaleView}
            {yAxes}
            on:mouseOver={onMouseOver}
          />
        {/if}
        {#if layer.chartType === 'x-range'}
          <LayerXRange
            {...layer}
            {drawHeight}
            {drawWidth}
            filter={layer.filter.resource}
            {mousemove}
            {mouseout}
            resources={resourcesByViewLayerId[layer.id] ?? []}
            {xScaleView}
            on:mouseOver={onMouseOver}
          />
        {/if}
      {/each}
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

  .row.row-collapsed {
    display: none;
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
    position: relative;
  }

  .active-row:after {
    border: 1px solid #2f80ed;
    content: ' ';
    height: 100%;
    left: 0;
    pointer-events: none;
    position: absolute;
    top: 0;
    width: 100%;
  }
</style>
