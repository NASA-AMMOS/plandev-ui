<svelte:options immutable={true} />

<script lang="ts">
  import CaretDownIcon from '@nasa-jpl/stellar/icons/caret_down.svg?component';
  import CaretRightIcon from '@nasa-jpl/stellar/icons/caret_right.svg?component';
  import { createEventDispatcher } from 'svelte';
  import RowDragHandleMove from './RowDragHandleMove.svelte';

  export let expanded: boolean = true;
  export let rowId: number = 0;
  export let rowDragMoveDisabled: boolean = false;
  export let title: string = '';

  const dispatch = createEventDispatcher();

  function toggleExpansion() {
    dispatch('toggleRowExpansion', { expanded: !expanded, rowId });
  }
</script>

<div class="row-header">
  <div class="row-drag-handle-container">
    <RowDragHandleMove disabled={rowDragMoveDisabled} on:mouseDownRowMove />
  </div>

  <button class="st-button icon" on:click={toggleExpansion}>
    {#if expanded}
      <CaretDownIcon class="row-header-collapse" />
    {:else}
      <CaretRightIcon class="row-header-collapse" />
    {/if}
    <div class="row-header-title st-typography-medium">{title}</div>
  </button>

  {#if $$slots.right}
    <div class="right">
      <div>
        <slot name="right" />
      </div>
    </div>
  {/if}
</div>

<style>
  .row-header {
    align-items: center;
    background-color: var(--st-gray-10);
    border-bottom: 1px solid var(--st-gray-15);
    border-top: 1px solid var(--st-gray-15);
    display: flex;
    height: 24px;
    padding: 0px 8px 0px 4px;
    position: relative;
    z-index: 3;
  }

  .row-header-title {
    color: var(--st-gray-70);
    cursor: pointer;
    flex: 1;
    user-select: none;
  }

  :global(.row-header-collapse) {
    color: var(--st-gray-30);
  }

  .row-drag-handle-container {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
    flex: 1;
    font-size: 1.2rem;
    height: 100%;
    justify-content: center;
    opacity: 0.2;
    position: absolute;
    width: 100%;
    z-index: 0;
  }

  .right {
    align-items: center;
    display: flex;
    flex: 1;
    justify-content: flex-end;
    pointer-events: none;
  }

  .right > div {
    pointer-events: auto;
  }

  .row-header :global(.st-button) {
    z-index: 1;
  }

  .row-header :global(.st-button):hover {
    background: initial;
  }

  .row-header :global(.st-button):hover :global(svg) {
    color: var(--st-gray-50);
  }

  .row-header :global(.st-button):hover :global(.row-header-title) {
    color: var(--st-gray-100);
  }
</style>
