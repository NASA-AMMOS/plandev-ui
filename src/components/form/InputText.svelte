<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { slotChildCount } from '../../utilities/generic';

  const dispatch = createEventDispatcher();

  export let autocomplete: string = 'off';
  export let disabled: boolean = false;
  export let input: HTMLInputElement | undefined = undefined;
  export let invalid: boolean = false;
  export let name: string = '';
  export let placeholder: string = '';
  export let required: boolean = false;
  export let type: string = 'text';
  export let value: any = '';
  export let warning: boolean = false;

  let iconSize: number = 16;
  let left: number = 5;
  let prefixDiv: HTMLDivElement;
  let right: number = 5;
  let suffixDiv: HTMLDivElement;

  $: inputPaddingLeft = left + iconSize * prefixCount;
  $: inputPaddingRight = right + iconSize * suffixCount;
  $: prefixCount = slotChildCount(prefixDiv);
  $: suffixCount = slotChildCount(suffixDiv);

  function onChange(event: Event) {
    const { target: eventTarget } = event;
    const target = eventTarget as HTMLInputElement;
    const newValue = type === 'number' ? target.valueAsNumber : target.value;
    value = newValue;
    dispatch('change', newValue);
  }

  function setType(element: HTMLInputElement) {
    element.type = type;
  }
</script>

<div class="input-text" class:disabled class:error={invalid} class:warning>
  <div bind:this={prefixDiv} class="prefix" style="left: {left}px">
    <slot name="prefix" />
  </div>
  <input
    {autocomplete}
    bind:value
    bind:this={input}
    class:error={invalid}
    class:warning
    {disabled}
    {name}
    {placeholder}
    {required}
    style="padding-left: {inputPaddingLeft}px; padding-right: {inputPaddingRight}px;"
    on:change={onChange}
    on:input
    on:keyup
    use:setType
  />
  <div bind:this={suffixDiv} class="suffix" style="right: {right}px">
    <slot name="suffix" />
  </div>
</div>

<style>
  /** Global CSS Variables. */

  :global(body) {
    /* General. */
    --input-text-font-family: Inter, Roboto;
    --input-text-font-size: 12px;
    --input-text-min-width: 100px;

    /* Common Colors. */
    --input-text-error-background-color: rgba(255, 119, 96, 0.2);
    --input-text-warning-background-color: rgba(253, 180, 98, 0.2);

    /* Light Colors. */
    --input-text-background-color: var(--gray-20);
    --input-text-color: var(--gray-80);
    --input-text-disabled-background-color: var(--gray-10);
    --input-text-disabled-color: var(--gray-50);
    --input-text-focus-color: var(--blue);
    --input-text-icon-color: var(--gray-40);
    --input-text-icon-disabled-color: var(--gray-30);
    --input-text-placeholder-color: var(--gray-50);
  }

  /* Container Div. */

  .input-text {
    align-items: center;
    display: inline-flex;
    position: relative;
    width: 100%;
  }

  .input-text > .prefix {
    position: absolute;
  }

  .input-text > .suffix {
    position: absolute;
  }

  /* Slotted Icons. */

  .input-text :global(i) {
    color: var(--input-text-icon-color);
    font-size: 14px;
  }

  .input-text.disabled :global(i) {
    color: var(--input-text-icon-disabled-color);
    cursor: not-allowed;
  }

  .input-text.error :global(i) {
    color: var(--red);
  }

  .input-text.warning :global(i) {
    color: var(--orange);
  }

  /* Input. */

  .input-text > input {
    background-color: var(--input-text-background-color);
    border-radius: 4px;
    border: 1px solid var(--input-text-background-color);
    color: var(--input-text-color);
    font-family: var(--input-text-font-family);
    font-size: var(--input-text-font-size);
    font-style: normal;
    font-weight: 500;
    height: 24px;
    letter-spacing: 0.04em;
    line-height: 16px;
    min-width: var(--input-text-min-width);
    width: 100%;
  }

  .input-text > input:disabled {
    background-color: var(--input-text-disabled-background-color);
    border: 1px solid var(--input-text-disabled-background-color);
    color: var(--input-text-disabled-color);
    cursor: not-allowed;
  }

  .input-text > input:disabled::placeholder {
    color: var(--input-text-disabled-color);
  }

  .input-text > input:focus {
    box-shadow: 0 0 0 2px var(--input-text-focus-color);
    outline: 0;
  }

  .input-text > input::placeholder {
    color: var(--input-text-placeholder-color);
  }

  /* Input Error. */

  .input-text > input.error {
    background-color: var(--input-text-error-background-color);
    border: 1px solid var(--red);
    color: var(--red);
  }

  .input-text > input.error:disabled {
    background-color: var(--input-text-disabled-background-color);
    border: 1px solid var(--red);
    color: var(--input-text-disabled-color);
    cursor: not-allowed;
  }

  .input-text > input.error:disabled::placeholder {
    color: var(--input-text-disabled-color);
  }

  .input-text > input.error:focus {
    box-shadow: 0 0 0 1px var(--red);
    outline: 0;
  }

  .input-text > input.error::placeholder {
    color: var(--red);
  }

  /* Input Warning. */

  .input-text > input.warning {
    background-color: var(--input-text-warning-background-color);
    border: 1px solid var(--orange);
    color: var(--orange);
  }

  .input-text > input.warning:disabled {
    background-color: var(--input-text-disabled-background-color);
    border: 1px solid var(--orange);
    color: var(--input-text-disabled-color);
    cursor: not-allowed;
  }

  .input-text > input.warning:disabled::placeholder {
    color: var(--input-text-disabled-color);
  }

  .input-text > input.warning:focus {
    box-shadow: 0 0 0 1px var(--orange);
    outline: 0;
  }

  .input-text > input.warning::placeholder {
    color: var(--orange);
  }
</style>
