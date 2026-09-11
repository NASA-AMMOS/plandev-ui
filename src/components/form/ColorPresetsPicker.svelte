<svelte:options immutable={true} />

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Placement } from 'tippy.js';
  import { getTarget } from '../../utilities/generic';
  import { tooltip } from '../../utilities/tooltip';
  import Menu, { type MenuType } from '../menus/Menu.svelte';
  import ColorPicker from './ColorPicker.svelte';

  export let value: string = '';
  /** Makes a sibling `<label for>` resolve to the trigger. The accessible name comes from `tooltipText`. */
  export let id: string | undefined = undefined;
  export let tooltipText: string = 'Color';
  export let placement: Placement = 'bottom-end';
  export let presetColors: string[] = ['#ef8b8c', '#febd85'];
  /**
   * Trigger swatch size in px. Only the trigger: the preset swatches inside the menu stay full size,
   * being a palette to aim at rather than an indicator.
   */
  export let size: number = 24;
  // Menus of the same type hide each other, so a picker nested inside another menu must not share
  // that menu's type, or opening it would close its own parent
  export let type: MenuType = 'dropdown';

  let pickerMenu: Menu;
  let triggerElement: HTMLButtonElement;

  $: colorIsCustom = presetColors.indexOf(value) < 0;

  const dispatch = createEventDispatcher<{
    input: { value: string };
  }>();

  onMount(() => {
    // Menu dismisses itself from a body click listener, but a Menu this picker is nested inside stops
    // click propagation on its own content, leaving the picker stuck open. Capture phase runs before
    // any ancestor can stop the event.
    document.addEventListener('click', onDocumentClickCapture, true);
    return () => document.removeEventListener('click', onDocumentClickCapture, true);
  });

  // The Menu renders inside the trigger button, so any click in that subtree is a click on the picker
  // itself -- the toggle, a preset, or the custom color input
  function onDocumentClickCapture(event: MouseEvent) {
    if (pickerMenu?.isShown() && !triggerElement?.contains(event.target as Node)) {
      pickerMenu.hide();
    }
  }

  function onInput(value: string) {
    dispatch('input', { value });
  }

  function onColorPickerInput(event: Event) {
    const { value } = getTarget(event);
    onInput(value as string);
  }
</script>

<button
  bind:this={triggerElement}
  {id}
  type="button"
  class="st-button color-preset-picker color relative dark:border-white/20"
  use:tooltip={{ content: tooltipText, placement: 'top' }}
  style={`background: ${value}; height: ${size}px; width: ${size}px`}
  on:click|stopPropagation={() => pickerMenu.toggle()}
>
  <Menu escapeScrollBoundary bind:this={pickerMenu} hideAfterClick={false} {placement} {type}>
    <div class="colors bg-popover">
      {#each presetColors as color}
        <button
          type="button"
          aria-label="preset color"
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
