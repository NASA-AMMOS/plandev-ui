<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export { className as class };
  export { styleName as style };
  export let disabled: boolean = false;
  export let invalid: boolean = false;
  export let name: string = '';
  export let required: boolean = false;
  export let value: string | number = '';

  let className: string = '';
  let styleName: string = '';
</script>

<select
  bind:value
  class="select {className}"
  class:error={invalid}
  {disabled}
  {name}
  {required}
  style={styleName}
  on:change={() => dispatch('change', value)}
>
  <slot />
</select>

<style>
  :global(body) {
    /* General. */
    --st-select-font-family: Inter, Roboto;
    --st-select-font-size: 12px;
    --st-select-min-width: 100px;

    /* Light Colors. */
    --st-select-background: var(--st-gray-20);
    --st-select-color: var(--st-gray-80);
    --st-select-disabled-background: var(--st-gray-20);
    --st-select-disabled-color: var(--st-gray-50);
    --st-select-focus-color: var(--st-blue);
    --st-select-hover-background: #e6e6e6;
  }

  .select {
    background: var(--st-select-background);
    border: 0;
    border-radius: 4px;
    color: var(--st-select-color);
    cursor: pointer;
    font-family: var(--st-select-font-family);
    font-size: var(--st-select-font-size);
    font-style: normal;
    font-weight: 500;
    height: 24px;
    letter-spacing: 0.04em;
    line-height: 16px;
    min-width: var(--st-select-min-width);
    width: 100%;
  }

  .select:disabled {
    background: var(--st-select-disabled-background);
    color: var(--st-select-disabled-color);
    cursor: not-allowed;
  }

  .select:focus {
    box-shadow: 0 0 0 2px var(--st-select-focus-color);
    outline: 0;
  }

  .select:hover:not([disabled]) {
    background: var(--st-select-hover-background);
  }

  .select.error {
    border: 1px solid var(--st-red);
    color: var(--st-red);
  }
</style>
