<script lang="ts">
  import type { ScaleTime } from 'd3-scale';
  import { createEventDispatcher } from 'svelte';
  import type {
    Activity,
    Axis,
    ConstraintViolation,
    HorizontalGuide,
    Layer,
    MouseDownPoints,
    MouseOverPoints,
    Point,
    Resource,
    StringTMap,
    TimeRange,
    VerticalGuide,
    XAxisTick,
  } from '../../types';
  import ConstraintViolations from './ConstraintViolations.svelte';
  import LayerActivity from './LayerActivity.svelte';
  import LayerLine from './LayerLine.svelte';
  import LayerXRange from './LayerXRange.svelte';
  import RowHorizontalGuides from './RowHorizontalGuides.svelte';
  import RowVerticalGuides from './RowVerticalGuides.svelte';
  import RowXAxisTicks from './RowXAxisTicks.svelte';
  import RowYAxes from './RowYAxes.svelte';
  import RowDragHandleHeight from './RowDragHandleHeight.svelte';
  import RowDragHandleMove from './RowDragHandleMove.svelte';

  const dispatch = createEventDispatcher();

  export let activities: Activity[] = [];
  export let activitiesMap: StringTMap<Activity> = {};
  export let autoAdjustHeight: boolean = false;
  export let constraintViolations: ConstraintViolation[] = [];
  export let drawHeight: number = 0;
  export let drawWidth: number = 0;
  export let horizontalGuides: HorizontalGuide[] = [];
  export let id: string = '';
  export let layers: Layer[] = [];
  export let marginLeft: number = 50;
  export let resources: Resource[] = [];
  export let rowDragMoveDisabled = true;
  export let selectedActivity: Activity | null = null;
  export let verticalGuides: VerticalGuide[] = [];
  export let viewTimeRange: TimeRange | null = null;
  export let xScaleView: ScaleTime<number, number> | null = null;
  export let xTicksView: XAxisTick[] = [];
  export let yAxes: Axis[] = [];

  let dragenter: DragEvent;
  let dragleave: DragEvent;
  let dragover: DragEvent;
  let drop: DragEvent;
  let mousedown: MouseEvent;
  let mousemove: MouseEvent;
  let mouseout: MouseEvent;
  let mouseup: MouseEvent;
  let mouseDownPointsByLayer: StringTMap<Point[]> = {};
  let mouseOverPointsByLayer: StringTMap<Point[]> = {};
  let overlaySvg: SVGElement;

  function onMouseDownPoints(event: CustomEvent<MouseDownPoints>) {
    const { detail } = event;
    mouseDownPointsByLayer[detail.layerId] = detail.points;
    const points = Object.values(mouseDownPointsByLayer).flat();
    dispatch('mouseDownPoints', { ...detail, points });
  }

  function onMouseOverPoints(event: CustomEvent<MouseOverPoints>) {
    const { detail } = event;
    mouseOverPointsByLayer[detail.layerId] = detail.points;
    const points = Object.values(mouseOverPointsByLayer).flat();
    dispatch('mouseOverPoints', { ...detail, points });
  }

  function onUpdateRowHeight(event: CustomEvent<{ newHeight: number }>) {
    const { newHeight } = event.detail;
    dispatch('updateRowHeight', { newHeight, rowId: id });
  }
</script>

<div>
  <div class="row" {id} style="height: {drawHeight}px;">
    <!-- Hover Menu. -->
    <div class="row-hover-menu">
      <RowDragHandleMove disabled={rowDragMoveDisabled} on:mouseDownRowMove />
    </div>

    <!-- Overlay for Pointer Events. -->
    <svg
      bind:this={overlaySvg}
      class="overlay"
      style="transform: translate({marginLeft}px, 0px); width: {drawWidth}px"
      on:blur={e => e}
      on:dragenter|preventDefault={e => (dragenter = e)}
      on:dragleave={e => (dragleave = e)}
      on:dragover|preventDefault={e => (dragover = e)}
      on:drop|preventDefault={e => (drop = e)}
      on:mousedown={e => (mousedown = e)}
      on:mousemove={e => (mousemove = e)}
      on:mouseout={e => (mouseout = e)}
      on:mouseup={e => (mouseup = e)}
    />

    <!-- SVG Elements. -->
    <svg>
      <g transform="translate({marginLeft}, 0)">
        {#if drawWidth > 0}
          <ConstraintViolations
            {constraintViolations}
            {drawHeight}
            {drawWidth}
            {mousemove}
            {mouseout}
            {viewTimeRange}
            {xScaleView}
            on:mouseOverViolations
          />
          <RowYAxes {drawHeight} {yAxes} />
          <RowHorizontalGuides
            {drawHeight}
            {drawWidth}
            {horizontalGuides}
            {yAxes}
          />
          <RowVerticalGuides
            {drawHeight}
            {verticalGuides}
            {viewTimeRange}
            {xScaleView}
          />
          <RowXAxisTicks {drawHeight} {xScaleView} {xTicksView} />
        {/if}
      </g>
    </svg>

    <!-- Layers of Canvas Visualizations. -->
    <div
      class="layers"
      style="transform: translate({marginLeft}px, 0px); width: {drawWidth}px"
    >
      {#each layers as layer (layer.id)}
        {#if layer.chartType === 'activity'}
          <LayerActivity
            {...layer}
            {activities}
            {activitiesMap}
            {drawHeight}
            {drawWidth}
            {dragenter}
            {dragleave}
            {dragover}
            {drop}
            filter={layer.filter.activity}
            {mousedown}
            {mousemove}
            {mouseout}
            {mouseup}
            {overlaySvg}
            {selectedActivity}
            {viewTimeRange}
            {xScaleView}
            on:dragActivity
            on:dragActivityEnd
            on:dropActivity
            on:mouseDownPoints={onMouseDownPoints}
            on:mouseOverPoints={onMouseOverPoints}
            on:updateRowHeight={e => {
              if (autoAdjustHeight) {
                onUpdateRowHeight(e);
              }
            }}
          />
        {/if}
        {#if layer.chartType === 'line'}
          <LayerLine
            {...layer}
            {drawHeight}
            {drawWidth}
            filter={layer.filter.resource}
            lineColor={layer.color}
            {mousemove}
            {mouseout}
            {resources}
            {viewTimeRange}
            {xScaleView}
            {yAxes}
            on:mouseOverPoints={onMouseOverPoints}
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
            {resources}
            {xScaleView}
            on:mouseOverPoints={onMouseOverPoints}
          />
        {/if}
      {/each}
    </div>
  </div>

  <!-- Drag Handle for Row Height Resizing. -->
  <RowDragHandleHeight
    rowHeight={drawHeight}
    on:updateRowHeight={onUpdateRowHeight}
  />
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

  .row-hover-menu {
    color: var(--gray-50);
    font-size: 1.2rem;
    display: none;
    position: absolute;
    z-index: 2;
  }

  .row:hover > .row-hover-menu {
    display: block;
  }
</style>
