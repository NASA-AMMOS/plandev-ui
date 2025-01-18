<svelte:options immutable={true} />

<script lang="ts">
  import { debounce } from 'lodash-es';
  import { onDestroy, onMount } from 'svelte';
  import { classNames } from '../../../../utilities/generic';

  export let resizable: boolean = true;
  export let width: number = 0;
  export let height: number = 0;
  export let className: string = '';

  let rootRef: HTMLDivElement;
  let currentWidth = width;
  let currentHeight = height;
  let resizeObserver: ResizeObserver | null = null;
  let onResizeDebounced = debounce(onResize, 0);

  onMount(() => {
    resizeObserver = new ResizeObserver(() => {
      onResizeDebounced();
    });
    resizeObserver.observe(rootRef);
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
  });

  function onResize() {
    if (rootRef) {
      const { width, height } = rootRef.getBoundingClientRect();
      currentWidth = width;
      currentHeight = height;
    }
  }
</script>

<div
  bind:this={rootRef}
  style:width={`${currentWidth}px`}
  style:height={`${currentHeight}px`}
  class={classNames('root', { [className]: !!className })}
  style:resize={resizable ? 'both' : 'none'}
>
  <slot />
</div>

<style>
  .root {
    overflow: hidden;
  }
</style>
