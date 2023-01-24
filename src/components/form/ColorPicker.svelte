<svelte:options immutable={true} />

<script lang="ts">
  import { classNames } from '../../utilities/generic';

  export let className: string = '';
  export let name: string = '';
  export let value: string = '';

  $: inputClasses = classNames('color-picker', {
    [className]: !!className,
  });
</script>

<div class={inputClasses}>
  <input {value} class="color-picker-input" on:input on:change type="color" {name} />
</div>

<style>
  .color-picker {
    display: flex;
    position: relative;
  }

  .color-picker:after {
    border: 1px solid rgb(0 0 0 / 25%);
    border-radius: 4px;
    content: ' ';
    height: 100%;
    left: 0;
    pointer-events: none;
    position: absolute;
    top: 0;
    width: 100%;
  }

  .color-picker:hover:after {
    border: 1px solid rgb(0 0 0 / 80%);
  }

  .color-picker-input {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-color: transparent;
    border: none;
    cursor: pointer;
    flex-shrink: 0;
    height: 24px;
    margin: 0;
    padding: 0;
    position: relative;
    width: 24px;
  }

  .color-picker-input::-webkit-color-swatch {
    border: none;
    border-radius: 4px;
  }

  .color-picker-input::-moz-color-swatch {
    border: none;
    border-radius: 4px;
  }

  .color-picker-input::-webkit-color-swatch-wrapper {
    border: none;
    border-radius: 4px;
    padding: 0;
  }
</style>
