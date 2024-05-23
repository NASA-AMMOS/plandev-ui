<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte';
  import type { RadioButtonContext, RadioButtonId } from '../../../types/radio-buttons';
  import { useActions, type ActionArray } from '../../../utilities/useActions';
  import { DefaultRadioButtonContextKey } from './RadioButtons.svelte';

  export { className as class };
  export let disabled: boolean = false;
  export let id: RadioButtonId = {};
  export let radioButtonContextKey: string = DefaultRadioButtonContextKey;
  export let use: ActionArray = [];

  const { registerRadioButton, selectRadioButton, selectedRadioButton, unregisterRadioButton } =
    getContext<RadioButtonContext>(radioButtonContextKey);

  let className: string = '';

  function onSelectRadioButton() {
    selectRadioButton(id);
  }

  $: if (!disabled) {
    registerRadioButton(id);
  } else {
    unregisterRadioButton(id);
  }
</script>

<button
  aria-checked={$selectedRadioButton === id}
  role="radio"
  class={className}
  class:radio-button={true}
  class:st-button={true}
  class:selected={$selectedRadioButton === id}
  on:click={onSelectRadioButton}
  use:useActions={use}
  {disabled}
>
  <slot />
</button>

<style>
  button.radio-button.st-button {
    background: var(--st-gray-10);
    border: 1px solid transparent;
    color: var(--st-gray-60);
  }
  button.radio-button.st-button:hover {
    color: var(--st-text-color);
  }
  button.radio-button.st-button.selected {
    background-color: white;
    border: 1px solid var(--st-gray-20);
    color: var(--st-text-color);
    font-weight: var(--st-typography-medium-font-weight);
  }
</style>
