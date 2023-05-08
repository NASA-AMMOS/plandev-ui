<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getTarget } from '../utilities/generic';

  export let placeholder: string = 'Filter items';
  export let value: string = '';

  const dispatch = createEventDispatcher();
</script>

<div class="collapsible-list-controls">
  <div class="collapsible-list-controls-top">
    <input
      autocomplete="off"
      bind:value
      class="st-input w-100"
      name="filter"
      {placeholder}
      on:input={event => {
        const { name, value } = getTarget(event);
        dispatch('input', { name, value });
      }}
    />
    <slot name="right" />
  </div>
  <slot />
</div>

<style>
  .collapsible-list-controls-top {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }
</style>
