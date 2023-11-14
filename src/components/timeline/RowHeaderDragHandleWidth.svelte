<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ViewConstants } from '../../enums/view';

  export let rowHeaderWidth: number = 0;
  export let width: number = 2;

  const dispatch = createEventDispatcher();

  let dragElement: HTMLElement;
  let previousWidth: number = 0;

  function onMouseMove(event: MouseEvent): void {
    const dx = event.clientX - dragElement.getBoundingClientRect().x;
    const newWidth = Math.max(rowHeaderWidth + dx, ViewConstants.MIN_MARGIN_LEFT);

    if (newWidth !== previousWidth) {
      dispatch('updateRowHeaderWidth', { newWidth });
      previousWidth = newWidth;
    }

    event.stopPropagation();
    event.preventDefault();
  }

  function onMouseDown(): void {
    document.addEventListener('mousemove', onMouseMove, false);
  }

  function onMouseUp(): void {
    document.removeEventListener('mousemove', onMouseMove, false);
  }
</script>

<svelte:window on:mouseup={onMouseUp} />

<div class="row-header-drag-handle-width">
  <div
    bind:this={dragElement}
    style={`transform: translateX(${rowHeaderWidth || 0}px); left: -${width}px; width: ${width}px`}
    class="row-header-drag-handle-width--handle"
    role="none"
    on:mousedown|capture={onMouseDown}
  />
</div>

<style>
  .row-header-drag-handle-width {
    height: 100%;
    pointer-events: none;
    position: absolute;
    width: 100%;
  }

  .row-header-drag-handle-width--handle {
    background-color: var(--st-gray-20);
    cursor: col-resize;
    height: 100%;
    pointer-events: auto;
    position: absolute;
    z-index: 4;
  }

  .row-header-drag-handle-width--handle:hover {
    background-color: var(--st-gray-30);
  }
</style>
