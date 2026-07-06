<script lang="ts">
  import MarkerIcon from '@nasa-jpl/stellar/icons/marker.svg?component';
  import AddMarkerIcon from '@nasa-jpl/stellar/icons/marker_add.svg?component';
  import RemoveMarkerIcon from '@nasa-jpl/stellar/icons/marker_remove.svg?component';
  import { afterUpdate } from 'svelte';

  export let x = 0;
  export let maxWidth = 0;
  export let label = '';
  export let activeCursor = false;
  export let color = '';
  export let flippable = false;
  export let maxWidthFlipped = 0;

  let hovered = false;
  let flipped = false;
  let labelElement: HTMLDivElement;

  $: labelMaxWidth = flipped ? maxWidthFlipped : maxWidth;

  afterUpdate(() => {
    if (!flippable || !labelElement) {
      if (flipped) {
        flipped = false;
      }
      return;
    }

    // `scrollWidth` reports the label's natural (unclipped) content width even when it is
    // ellipsized via `max-width` + `overflow: hidden`, so it is independent of the current
    // flip state and the comparison below is stable.
    const overflowsRight = labelElement.scrollWidth > maxWidth;
    const nextFlipped = overflowsRight && maxWidthFlipped > maxWidth;
    if (nextFlipped !== flipped) {
      flipped = nextFlipped;
    }
  });
</script>

<div class="timeline-cursor" style="transform: translateX({x}px)">
  <div class="timeline-cursor-line" style="background: {color}" />
  <button
    class="timeline-cursor-icon"
    aria-label="Timeline Cursor"
    style="color: {color}"
    on:click
    on:mouseenter={() => (hovered = true)}
    on:mouseleave={() => (hovered = false)}
  >
    {#if activeCursor}
      <AddMarkerIcon />
    {:else if hovered}
      <RemoveMarkerIcon />
    {:else}
      <MarkerIcon />
    {/if}
  </button>
  <div class="timeline-cursor-label" class:flipped style="max-width: {labelMaxWidth}px;" bind:this={labelElement}>
    {label}
  </div>
</div>

<style>
  .timeline-cursor {
    height: 100%;
    left: 0;
    opacity: 1;
    position: absolute;
    top: -10px;
    transform: translateX(0);
  }

  .timeline-cursor-icon {
    background-color: transparent;
    border: none;
    color: var(--st-gray-60);
    cursor: pointer;
    display: block;
    height: 16px;
    left: 0;
    left: -7.5px;
    margin: 0;
    padding: 0;
    pointer-events: all;
    position: absolute;
    top: -9px;
    width: 15px;
  }

  .timeline-cursor-line {
    background-color: var(--st-gray-50);
    display: block;
    height: 100%;
    left: -0.5px;
    position: absolute;
    top: 0;
    width: 1px;
  }

  .timeline-cursor-label {
    background-color: var(--st-gray-15);
    border-radius: 16px;
    box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.25);
    font-size: 12px;
    font-variant: tabular-nums;
    left: 10px;
    line-height: 16px;
    overflow: hidden;
    padding: 0 5px;
    pointer-events: all;
    position: absolute;
    text-overflow: ellipsis;
    top: -11px;
    white-space: nowrap;
    z-index: 0;
  }

  .timeline-cursor-label.flipped {
    left: auto;
    right: 10px;
    text-align: right;
  }

  .timeline-cursor:hover .timeline-cursor-label {
    max-width: 100vw !important;
    z-index: 4;
  }
</style>
