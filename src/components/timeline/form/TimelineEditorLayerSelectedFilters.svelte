<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ChartType } from '../../../types/timeline';
  import Collapse from '../../Collapse.svelte';
  import Chip from '../../ui/Chip.svelte';

  export let filters: string[];
  export let chartType: ChartType;
  export let initialItemLimit: number = 10;

  let filtersToRender = [];
  let showAll = false;
  let verb = '';

  $: if (filters) {
    if (filters.length !== 1) {
      verb = chartType === 'activity' ? 'activities' : 'resources';
    } else {
      verb = chartType === 'activity' ? 'activity' : 'resource';
    }

    if (showAll) {
      filtersToRender = filters;
    } else {
      filtersToRender = filters.slice(0, initialItemLimit);
    }
  }

  const dispatch = createEventDispatcher();
</script>

<div class="st-typography-medium timeline-editor-layer-selected-filters">
  {#if filters.length === 0}
    <div class="filter-items-empty">
      No {chartType === 'activity' ? 'activities' : 'resources'} selected
    </div>
  {:else}
    <Collapse title={`${filters.length} ${verb}`} className="filter-items" titleClassName="filter-items-title">
      {#each filtersToRender as item}
        <Chip label={item} on:click={() => dispatch('remove', { filter: item })} />
      {/each}
      {#if filters.length > initialItemLimit}
        {#if showAll}
          <button class="item-visibility-button" on:click={() => (showAll = false)}>Show Fewer</button>
        {:else}
          <button class="item-visibility-button" on:click={() => (showAll = true)}>Show More</button>
        {/if}
      {/if}
    </Collapse>
  {/if}
</div>

<style>
  .filter-items-empty {
    align-items: center;
    display: flex;
    height: 16px;
    margin: 8px 0px 8px 16px;
  }

  .item-visibility-button {
    background: none;
    border: none;
    color: var(--st-utility-blue);
    cursor: pointer;
    padding: 0;
    text-align: left;
  }

  .item-visibility-button:hover {
    opacity: 0.8;
  }

  .timeline-editor-layer-selected-filters :global(.filter-items-title) {
    text-transform: capitalize;
  }

  .timeline-editor-layer-selected-filters :global(.collapse.filter-items .content) {
    gap: 8px;
    margin: 8px 0 8px 16px;
  }
</style>
