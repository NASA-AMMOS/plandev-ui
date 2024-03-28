<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { clamp } from '../../utilities/generic';

  export let minHeight: number | string = 50;
  export let maxHeight: number | string = Infinity;
  export let rowHeight: number = 0;

  const dispatch = createEventDispatcher<{
    updateRowHeight: { newHeight: number };
  }>();

  let dragElement: HTMLElement;
  let previousHeight: number = 0;

  function getPixelHeight(value: string | number): number {
    if (typeof value === 'string' && /%/.test(value)) {
      const valuePercentage = parseInt(value.replace('%', '')) / 100;
      return valuePercentage * document.body.clientHeight;
    }

    return parseInt(`${value}`);
  }

  function onMouseMove(event: MouseEvent): void {
    const dy = event.clientY - dragElement.getBoundingClientRect().y;
    const newHeight = clamp(rowHeight - dy, getPixelHeight(minHeight), getPixelHeight(maxHeight));

    if (newHeight !== previousHeight) {
      dispatch('updateRowHeight', { newHeight });
      previousHeight = newHeight;
    }
  }

  function onMouseDown(): void {
    document.addEventListener('mousemove', onMouseMove, false);
  }

  function onMouseUp(): void {
    document.removeEventListener('mousemove', onMouseMove, false);
  }
</script>

<svelte:window on:mouseup={onMouseUp} />

<div class="console-drag-handle-container">
  <div
    bind:this={dragElement}
    class="console-drag-handle-height"
    role="none"
    on:mousedown|preventDefault={onMouseDown}
  />
</div>

<style>
  .console-drag-handle-container {
    align-items: center;
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=');
    background-position: 50% 50%;
    background-repeat: no-repeat;
    display: flex;
    height: 3px;
    justify-content: center;
    position: absolute;
    width: 100%;
  }

  .console-drag-handle-height {
    background-color: var(--st-gray-20);
    cursor: row-resize;
    height: 3px;
    opacity: 0.5;
    width: 100%;
  }

  .console-drag-handle-height:hover {
    background-color: var(--st-gray-30);
  }

  .console-drag-handle-height:hover,
  .console-drag-handle-height:active {
    background-color: var(--st-gray-30);
    z-index: 4;
  }
</style>
