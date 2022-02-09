<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let rowHeight: number = 0;

  const dispatch = createEventDispatcher();

  let clientY: number | null = null;

  function onMouseMove(event: MouseEvent): void {
    if (clientY == null) {
      return;
    }

    const dy = event.clientY - clientY;
    const newHeight = rowHeight + dy;
    if (newHeight >= 50) {
      dispatch('updateRowHeight', { newHeight });
    }
    clientY = event.clientY;
  }

  function onMouseDown(event: MouseEvent): void {
    clientY = event.clientY;
    document.addEventListener('mousemove', onMouseMove, false);
  }

  function onMouseUp(): void {
    clientY = null;
    document.removeEventListener('mousemove', onMouseMove, false);
  }
</script>

<svelte:window on:mouseup={onMouseUp} />

<div class="row-drag-handle-height" on:mousedown={onMouseDown} />

<style>
  div {
    background-color: var(--st-gray-20);
    cursor: row-resize;
    height: 3px;
    opacity: 0.5;
    width: 100%;
  }
</style>
