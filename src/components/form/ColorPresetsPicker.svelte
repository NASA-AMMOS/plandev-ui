<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Placement } from 'tippy.js';
  import { getTarget } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';
  import Menu from '../menus/Menu.svelte';
  import ColorPicker from './ColorPicker.svelte';

  export let value: string = '';
  export let tooltipText: string = 'Color';
  export let placement: Placement = 'bottom-end';
  export let presetColors: string[] = ['#ef8b8c', '#febd85'];

  let pickerMenu: Menu;

  $: colorIsCustom = presetColors.indexOf(value) < 0;

  const dispatch = createEventDispatcher();

  function onInput(value: string) {
    dispatch('input', { value });
  }

  function onColorPickerInput(event: Event) {
    const { value } = getTarget(event);
    onInput(value as string);
  }
</script>

<button
  type="button"
  class="st-button color-preset-picker color"
  use:tooltip={{ content: tooltipText, placement: 'top' }}
  style={`position: relative; background: ${value}`}
  on:click|stopPropagation={() => pickerMenu.toggle()}
>
  <Menu bind:this={pickerMenu} hideAfterClick={false} {placement}>
    <div class="colors">
      {#each presetColors as color}
        <button
          type="button"
          class="st-button tertiary color"
          on:click={() => onInput(color)}
          style="background:{color}"
          class:active={color === value}
        />
      {/each}
      <ColorPicker
        tooltipText="Custom Color"
        value={colorIsCustom ? value : ''}
        name="color-presets-picker"
        on:input={onColorPickerInput}
        className={colorIsCustom ? 'active' : ''}
      />
    </div>
  </Menu>
</button>

<style>
  .color-preset-picker :global(.menu) {
    pointer-events: none;
  }
  .colors {
    cursor: auto;
    display: grid;
    grid-gap: 8px;
    grid-template-columns: repeat(4, 1fr);
    padding: 8px;
    pointer-events: auto;
  }
  .color {
    border: 1px solid rgb(0, 0, 0, 24%);
    border-radius: 4px;
    height: 24px;
    padding: 0;
    position: relative;
    width: 24px;
  }
  .color:hover:not(.active) {
    border: 1px solid rgb(0 0 0 / 80%);
  }
  .color.active:before {
    border: 2px solid var(--st-utility-blue);
    border-radius: 6px;
    content: ' ';
    height: 30px;
    left: -4px;
    position: absolute;
    top: -4px;
    width: 30px;
    z-index: 1;
  }
  .color-preset-picker :global(.color-picker.active):before {
    background:
      linear-gradient(white, white) padding-box,
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
        )
        border-box;
    border: 2px solid transparent;
    border-radius: 6px;
    content: ' ';
    height: 30px;
    left: -3px;
    position: absolute;
    top: -3px;
    width: 30px;
    z-index: 0;
  }
  .color-preset-picker :global(.color-picker) {
    width: 24px;
  }
</style>
