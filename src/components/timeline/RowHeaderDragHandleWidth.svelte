<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ViewConstants } from '../../enums/view';

  export let rowHeaderWidth: number = 0;
  export let width: number = 2;

  const dispatch = createEventDispatcher();

  let clientX: number | null = null;

  function onMouseMove(event: MouseEvent): void {
    if (clientX == null) {
      return;
    }

    const dx = event.clientX - clientX;
    const newWidth = rowHeaderWidth + dx;
    dispatch('updateRowHeaderWidth', {
      newWidth: newWidth >= ViewConstants.MIN_MARGIN_LEFT ? newWidth : ViewConstants.MIN_MARGIN_LEFT,
    });

    clientX = event.clientX;
    event.stopPropagation();
    event.preventDefault();
  }

  function onMouseDown(event: MouseEvent): void {
    clientX = event.clientX;
    document.addEventListener('mousemove', onMouseMove, false);
  }

  function onMouseUp(): void {
    clientX = null;
    document.removeEventListener('mousemove', onMouseMove, false);
  }
</script>

<svelte:window on:mouseup={onMouseUp} />

<div class="row-header-drag-handle-height">
  <div
    style={`transform: translateX(${rowHeaderWidth || 0}px); left: -${width}px; width: ${width}px`}
    class="row-header-drag-handle-height--handle"
    role="none"
    on:mousedown|capture={onMouseDown}
  />
</div>

<style>
  .row-header-drag-handle-height {
    height: 100%;
    pointer-events: none;
    position: absolute;
    width: 100%;
  }

  .row-header-drag-handle-height--handle {
    background-color: var(--st-gray-20);
    cursor: col-resize;
    height: 100%;
    pointer-events: auto;
    position: absolute;
    z-index: 4;
  }

  .row-header-drag-handle-height--handle:hover {
    background-color: var(--st-gray-30);
  }
</style>
