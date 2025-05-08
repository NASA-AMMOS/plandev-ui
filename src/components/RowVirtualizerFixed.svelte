<svelte:options accessors={true} />

<script lang="ts">
  import { createVirtualizer } from '@tanstack/svelte-virtual';

  export let count: number = 0;
  export let disabled: boolean = false;
  export let estimatedItemHeight: number = 32;
  export let selectedIndex: number | undefined = undefined;
  export let maxHeight: string = 'unset';
  export let minWidth: string = 'unset';
  export let overscan: number = 5;

  let virtualListEl: HTMLDivElement;

  $: virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
    count,
    estimateSize: () => estimatedItemHeight,
    getScrollElement: () => virtualListEl,
    overscan,
  });

  $: if (typeof selectedIndex === 'number') {
    requestAnimationFrame(() => {
      scrollToIndex(selectedIndex ?? 0);
    });
  }

  function scrollToIndex(index: number) {
    $virtualizer.scrollToIndex(index, { align: 'center' });
  }

  function onScroll(e: Event) {
    if (disabled) {
      e.preventDefault();
    }
  }
</script>

<div
  class="scroll-container"
  bind:this={virtualListEl}
  style:max-height={maxHeight}
  style:min-width={minWidth}
  on:scroll={onScroll}
  on:wheel={onScroll}
>
  <div style=" height: {$virtualizer.getTotalSize()}px;position: relative; width: 100%;">
    {#each $virtualizer.getVirtualItems() as item, idx (idx)}
      <div
        style=" height: {item.size}px; left: 0;position: absolute; top: 0; transform: translateY({item.start}px); width: 100%;"
      >
        <slot index={item.index} />
      </div>
    {/each}
  </div>
</div>

<style>
  .scroll-container {
    overflow: auto;
    width: 100%;
  }
</style>
