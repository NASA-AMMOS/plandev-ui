<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let placeholder: string = 'Filter items';
  export let value: string = '';

  const dispatch = createEventDispatcher<{
    input: { name: string; value: string };
  }>();

  function onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const { name, value } = input;
    dispatch('input', { name, value });
  }
</script>

<div class="collapsible-list-controls">
  <div class="collapsible-list-controls-top">
    <input autocomplete="off" bind:value class="st-input w-100" name="filter" {placeholder} on:input={onInput} />
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
