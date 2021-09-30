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
  export let value: string = '';

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
  on:change={e => dispatch('change', e)}
>
  <slot />
</select>

<style>
  :global(body) {
    /* General. */
    --select-font-family: Inter, Roboto;
    --select-font-size: 12px;
    --select-min-width: 100px;

    /* Light Colors. */
    --select-background: var(--gray-20);
    --select-color: var(--gray-80);
    --select-disabled-background: var(--gray-20);
    --select-disabled-color: var(--gray-50);
    --select-focus-color: var(--blue);
    --select-hover-background: #e6e6e6;
  }

  .select {
    background: var(--select-background);
    border: 0;
    border-radius: 4px;
    color: var(--select-color);
    cursor: pointer;
    font-family: var(--select-font-family);
    font-size: var(--select-font-size);
    font-style: normal;
    font-weight: 500;
    height: 24px;
    letter-spacing: 0.04em;
    line-height: 16px;
    min-width: var(--select-min-width);
    width: 100%;
  }

  .select:disabled {
    background: var(--select-disabled-background);
    color: var(--select-disabled-color);
    cursor: not-allowed;
  }

  .select:focus {
    box-shadow: 0 0 0 2px var(--select-focus-color);
    outline: 0;
  }

  .select:hover:not([disabled]) {
    background: var(--select-hover-background);
  }

  .select.error {
    border: 1px solid var(--red);
    color: var(--red);
  }
</style>
