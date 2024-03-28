<svelte:options immutable={true} />

<script lang="ts">
  import CaretDownIcon from '@nasa-jpl/stellar/icons/caret_down.svg?component';

  import CaretRightIcon from '@nasa-jpl/stellar/icons/caret_right.svg?component';
  import GripVerticalIcon from 'bootstrap-icons/icons/grip-vertical.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { Resource } from '../../types/simulation';
  import type { Axis, Layer, LineLayer, MouseOver } from '../../types/timeline';
  import { filterResourcesByLayer } from '../../utilities/timeline';
  import { tooltip } from '../../utilities/tooltip';
  import RowHeaderMenu from './RowHeaderMenu.svelte';
  import RowYAxes from './RowYAxes.svelte';

  export let expanded: boolean = true;
  export let height: number = 0;
  export let layers: Layer[];
  export let resources: Resource[];
  export let rowDragMoveDisabled: boolean = false;
  export let rowHeaderDragHandleWidthPx: number = 2;
  export let rowId: number = 0;
  export let title: string = '';
  export let width: number = 0;
  export let yAxes: Axis[];

  let resourceLabels: { color: string; label: string; resource: Resource; unit: string; yAxisId: number }[] = [];
  let yAxesWidth = 0;

  const dispatch = createEventDispatcher<{
    contextMenu: MouseOver;
    mouseDownRowMove: void;
    mouseUpRowMove: void;
    toggleRowExpansion: {
      expanded: boolean;
      rowId: number;
    };
  }>();

  function toggleExpansion() {
    dispatch('toggleRowExpansion', { expanded: !expanded, rowId });
  }

  function onUpdateYAxesWidth(event: CustomEvent<number>) {
    const width = event.detail;
    yAxesWidth = width;
  }

  $: {
    resourceLabels = [];
    yAxes.map(yAxis => {
      const yAxisResourceLayers = layers.filter(
        layer => layer.yAxisId === yAxis.id && (layer.chartType === 'line' || layer.chartType === 'x-range'),
      );
      // For each layer get the resources and color
      yAxisResourceLayers.forEach(layer => {
        const layerResources = filterResourcesByLayer(layer, resources) as Resource[];
        const newResourceLabels = layerResources
          .map(resource => {
            const color = (layer as LineLayer).lineColor || 'var(--st-gray-80)';
            const unit = resource.schema.metadata?.unit?.value || '';
            return {
              color,
              label: layer.name || resource.name,
              resource,
              unit,
              yAxisId: yAxis.id,
            };
          })
          .flat();
        resourceLabels = resourceLabels.concat(newResourceLabels);
      });
    });
  }
</script>

<div
  class="row-header"
  style:width={`${width - rowHeaderDragHandleWidthPx}px`}
  style:margin-right={`${rowHeaderDragHandleWidthPx}px`}
  style:height={expanded ? `${height}px` : '24px'}
  class:expanded
  role="banner"
  on:contextmenu={e => dispatch('contextMenu', { e, origin: 'row-header' })}
>
  <div class="row-header-left-column">
    {#if expanded}
      <div
        class="row-drag-handle-container"
        on:mousedown={() => dispatch('mouseDownRowMove')}
        on:mouseup={() => dispatch('mouseUpRowMove')}
        role="none"
        style={rowDragMoveDisabled ? 'cursor: grab' : 'cursor: grabbing'}
      >
        <GripVerticalIcon />
      </div>
      <div class="row-menu-container">
        <RowHeaderMenu on:contextMenu />
      </div>
    {/if}

    <div class="row-header-left-column-row">
      <button class="st-button icon row-header-title-button" on:click={toggleExpansion}>
        {#if expanded}
          <CaretDownIcon class="row-header-collapse" />
        {:else}
          <CaretRightIcon class="row-header-collapse" />
        {/if}
        <div class="row-header-title-container">
          <div
            class="row-header-title st-typography-label small-text"
            on:mousedown={() => dispatch('mouseDownRowMove')}
            on:mouseup={() => dispatch('mouseUpRowMove')}
            role="none"
            style={rowDragMoveDisabled ? 'cursor: grab' : 'cursor: grabbing'}
          >
            {title}
          </div>
        </div>
      </button>

      {#if resourceLabels.length > 0}
        <div class="row-header-y-axis-labels">
          {#each resourceLabels as label}
            <div
              class="st-typography-label small-text"
              style:color={label.color}
              use:tooltip={{ content: label.resource.name, interactive: true, placement: 'right' }}
            >
              <!-- See https://stackoverflow.com/a/27961022 for explanation of &lrm; "left to right mark" -->
              &lrm;{label.label}
              {#if label.unit}
                ({label.unit})
              {:else}
                &lrm;&nbsp;
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
  {#if expanded}
    <div class="row-header-right-column" style:width={`${yAxesWidth}px`}>
      <div class="row-header-y-axes">
        <RowYAxes
          drawWidth={yAxesWidth}
          drawHeight={height}
          {yAxes}
          on:updateYAxesWidth={onUpdateYAxesWidth}
          {layers}
          {resources}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .row-header {
    background-color: var(--st-gray-10);
    display: flex;
    flex-shrink: 0;
    gap: 4px;
    position: relative;
    z-index: 4;
  }

  .row-header-left-column,
  .row-header-right-column {
    display: flex;
  }

  .row-header-left-column {
    flex: 1;
    overflow: hidden;
  }

  .row-header-right-column {
    flex-shrink: 0;
    height: inherit;
  }

  .row-header-left-column-row {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .row-header-title-button {
    justify-content: flex-start;
    text-align: left;
  }

  .small-text {
    font-size: 10px;
    letter-spacing: 0.1px;
  }

  .row-header-title {
    color: var(--st-gray-70);
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
    white-space: nowrap;
  }

  .row-header:not(.expanded) .row-header-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.row-header-collapse) {
    color: var(--st-gray-30);
    flex-shrink: 0;
  }

  .row-drag-handle-container {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
    flex: 1;
    height: 100%;
    justify-content: flex-start;
    opacity: 0.2;
    padding-left: 0px;
    pointer-events: none;
    position: absolute;
    width: 100%;
    z-index: 0;
  }

  .row-drag-handle-container :global(*) {
    pointer-events: auto;
  }

  .row-menu-container {
    align-items: flex-end;
    color: var(--st-gray-50);
    display: flex;
    flex: 1;
    height: 100%;
    justify-content: flex-start;
    padding-bottom: 4px;
    padding-left: 4px;
    pointer-events: none;
    position: absolute;
    width: 100%;
    z-index: 2;
  }

  .row-menu-container :global(*) {
    pointer-events: auto;
  }

  .row-header .row-header-title-button:hover {
    background: initial;
  }

  .row-header :global(.st-button):hover :global(svg) {
    color: var(--st-gray-50);
  }

  .row-header :global(.st-button):hover :global(.row-header-title) {
    color: var(--st-gray-100);
  }

  .row-header-title-container {
    align-self: baseline;
    overflow: hidden;
    padding: 4px 0px;
    width: 100%;
  }

  .row-header-y-axes {
    pointer-events: none;
    position: absolute;
  }

  .row-header-y-axes {
    height: inherit;
    width: inherit;
  }

  .row-header-y-axis-labels {
    display: flex;
    flex-direction: column;
    margin-left: 16px;
  }

  .row-header-y-axis-labels div {
    direction: rtl;
    max-width: max-content;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
