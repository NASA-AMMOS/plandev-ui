<svelte:options immutable={true} />

<script lang="ts">
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import FilterIcon from '@nasa-jpl/stellar/icons/filter.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { tooltip } from '../../utilities/tooltip';

  export let isOn: boolean = false;
  export let label: string = '';
  export let offTooltipContent: string = '';
  export let onTooltipContent: string = '';
  export let tooltipPlacement: string = 'top';

  const dispatch = createEventDispatcher<{
    toggle: void;
  }>();

  function onClick() {
    dispatch('toggle');
  }
</script>

<button
  class="st-button filter-button"
  class:toggled={isOn}
  on:click|stopPropagation={onClick}
  use:tooltip={{ content: isOn ? onTooltipContent : offTooltipContent, placement: tooltipPlacement }}
>
  <div class="icons">
    <FilterIcon />
    <div class="hovered"><CloseIcon /></div>
  </div>
  <span>{label}</span>
</button>

<style>
  .filter-button {
    align-content: center;
    background-color: var(--st-gray-15, #f1f2f3);
    border-radius: 8px;
    color: var(--st-gray-60, #545f64);
    column-gap: 4px;
    display: grid;
    grid-template-columns: auto auto;
    padding: 4px;
    vertical-align: middle;
  }

  .filter-button .icons :global(*) {
    align-self: center;
    display: flex;
  }

  .filter-button .icons .hovered {
    display: none;
  }

  .toggled {
    background-color: var(--st-primary-10, #e6e6ff);
    color: var(--st-primary-90, #1d0ebe);
  }

  .toggled:hover {
    background-color: var(--st-primary-20, #c4c6ff);
  }

  .toggled:hover .icons > :global(svg) {
    display: none;
  }

  .toggled:hover .icons .hovered {
    display: inline;
  }
</style>
