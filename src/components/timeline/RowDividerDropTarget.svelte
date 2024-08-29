<svelte:options immutable={true} />

<script lang="ts">
  import DropTarget from './DropTarget.svelte';

  export let hintPosition: 'center' | 'bottom' = 'center';
  export let top: number = 0;
  export let width: number = 50;

  let isDragging: boolean = false;
</script>

<div class="row-divider-drop-target" style=" top: {top}px;width: {width}px;" class:dragging={isDragging}>
  <div class="row-divider-drop-target-inner">
    <DropTarget
      hint="Add Filter in New Row"
      {hintPosition}
      on:drop
      on:dragstart={_ => (isDragging = true)}
      on:dragend={_ => (isDragging = false)}
    />
  </div>
</div>

<style>
  .row-divider-drop-target {
    display: none;
    height: 0px;
    position: relative;
  }

  .row-divider-drop-target :global(.dropping::after) {
    background: var(--st-utility-blue);
    box-shadow: none;
    height: 2px;
  }

  .row-divider-drop-target-inner {
    height: inherit;
    height: 6px;
    pointer-events: none;
    position: absolute;
    transform: translateY(-50%);
    width: inherit;
    z-index: 5;
  }

  .row-divider-drop-target.dragging .row-divider-drop-target-inner {
    pointer-events: auto;
  }

  .row-divider-drop-target.dragging {
    display: flex;
  }
</style>
