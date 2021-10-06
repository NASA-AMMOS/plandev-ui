<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import Split from 'split.js';

  const dispatch = createEventDispatcher();

  export let direction: 'horizontal' | 'vertical' = 'vertical';
  export let id: string = '';
  export let ids: string[] = [];
  export let initialized: boolean = false;
  export let minSize: number = 0;
  export let sizes: number[] = [];

  let mounted: boolean = false;
  let split: Split.Instance;

  $: ids && mounted && setSplit();

  onMount(() => {
    mounted = true;
  });

  function setSplit() {
    if (split) {
      split.destroy();
    }

    // Make sure the sizes add up to 100 so we don't ever have blank space.
    const totalSize = sizes.reduce((total, size) => (total += size), 0);
    if (totalSize < 100) {
      const remainder = 100 - totalSize;
      sizes[sizes.length - 1] += remainder;
    }

    split = Split(ids, {
      direction,
      gutterSize: 3,
      minSize,
      onDragEnd: newSizes => dispatch('dragEnd', { newSizes }),
      sizes,
    });

    initialized = true;
  }
</script>

<div class="split-{direction}" {id}>
  <slot />
</div>

<style>
  div {
    height: 100%;
    overflow: hidden;
    width: 100%;
  }

  div :global(.gutter) {
    background-color: #eee;
    background-position: 50%;
    background-repeat: no-repeat;
  }

  div :global(.gutter.gutter-horizontal) {
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');
    cursor: col-resize;
  }

  div :global(.gutter.gutter-vertical) {
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=');
    cursor: row-resize;
  }

  .split-horizontal {
    display: flex;
    flex-direction: row;
  }
</style>
