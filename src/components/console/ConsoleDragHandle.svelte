<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { clamp } from '../../utilities/generic';

  export let minHeight: number | string = 50;
  export let maxHeight: number | string = Infinity;
  export let rowHeight: number = 0;

  const dispatch = createEventDispatcher();

  let clientY: number | null = null;

  function getPixelHeight(value: string | number): number {
    if (typeof value === 'string' && /%/.test(value)) {
      const valuePercentage = parseInt(value.replace('%', '')) / 100;
      return valuePercentage * document.body.clientHeight;
    }

    return parseInt(`${value}`);
  }

  function onMouseMove(event: MouseEvent): void {
    if (clientY == null) {
      return;
    }

    const dy = event.clientY - clientY;
    const newHeight = rowHeight - dy;

    dispatch('updateRowHeight', { newHeight: clamp(newHeight, getPixelHeight(minHeight), getPixelHeight(maxHeight)) });

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

<div class="console-drag-handle-container">
  <div class="console-drag-handle-height" role="none" on:mousedown|preventDefault={onMouseDown} />
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
</style>
