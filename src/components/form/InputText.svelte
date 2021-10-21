<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getTarget, slotChildCount } from '../../utilities/generic';

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
    const { value: newValue } = getTarget(event);
    value = newValue;
    dispatch('change', value);
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
    class="st-input w-100"
    class:error={invalid}
    class:warning
    {disabled}
    {name}
    {placeholder}
    {required}
    style="padding-left: {inputPaddingLeft}px; padding-right: {inputPaddingRight}px;"
    on:change={onChange}
    on:keyup
    use:setType
  />
  <div bind:this={suffixDiv} class="suffix" style="right: {right}px">
    <slot name="suffix" />
  </div>
</div>

<style>
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
    color: var(--st-input-icon-color);
    font-size: 14px;
  }

  .input-text.disabled :global(i) {
    color: var(--st-input-icon-disabled-color);
    cursor: not-allowed;
  }

  .input-text.error :global(i) {
    color: var(--st-red);
  }

  .input-text.warning :global(i) {
    color: var(--st-orange);
  }
</style>
