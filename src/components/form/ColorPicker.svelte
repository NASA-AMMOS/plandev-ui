<svelte:options immutable={true} />

<script lang="ts">
  import { classNames } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';
  export let className: string = '';
  export let name: string = '';
  export let tooltipText: string = '';
  export let value: string = '';
  $: inputClasses = classNames('color-picker', {
    [className]: !!className,
  });
</script>

<div class={inputClasses} use:tooltip={{ content: tooltipText, placement: 'top' }}>
  <input {value} class="color-picker-input" on:input on:change type="color" {name} />
  {#if !value}
    <div class="color-wheel">
      <div class="color-wheel-hue" />
    </div>
  {/if}
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
    z-index: 1;
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
  .color-wheel {
    height: 24px;
    pointer-events: none;
    position: absolute;
    width: 24px;
    z-index: 1;
  }
  .color-wheel-hue {
    background: radial-gradient(50% 50% at 50% 50%, #ffffff 0%, transparent 100%),
      conic-gradient(
        from 0deg at 50% 50%,
        #ff0000 0deg,
        #ffa800 47.73deg,
        #ffff00 79.56deg,
        #00ff00 121.33deg,
        #00ffff 180.99deg,
        #0000ff 238.67deg,
        #ff00ff 294.36deg,
        #ff0000 360deg
      ),
      #c4c4c4;
    border-radius: 4px;
    box-sizing: border-box;
    height: 100%;
    left: 0px;
    position: absolute;
    top: 0px;
    transform: rotateZ(90deg);
    width: 100%;
  }
</style>
