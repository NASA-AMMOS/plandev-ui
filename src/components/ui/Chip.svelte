<script lang="ts">
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { isValidHex, pickTextColorBasedOnBgColor, shadeColor } from '../../utilities/color';
  import { classNames } from '../../utilities/generic';

  export let color: string | null | undefined = '#f8f8f8';
  export let disabled: boolean = false;
  export let label: string = '';
  export let className: string = '';
  export let removable: boolean = true;
  export let ariaRole: string = 'button';

  let chipStyle: string = '';
  let removeStyle: string = '';

  const dispatch = createEventDispatcher<{
    click: void;
  }>();

  $: rootClasses = classNames('st-chip st-typography-body', {
    'chip-removable': removable,
    'chip-with-label': !!label,
    [className]: !!className,
  });

  $: {
    let finalColor = typeof color === 'string' && isValidHex(color) ? color : '#f8f8f8';
    const mode = pickTextColorBasedOnBgColor(finalColor);
    let textColor = '';
    let removeColor = '';
    let removeBgColor = '';
    if (mode === 'dark') {
      textColor = shadeColor(finalColor, 5);
      removeColor = shadeColor(finalColor || '', 5.5);
      removeBgColor = shadeColor(finalColor, 1.1);
    } else {
      textColor = 'rgb(255,255,255)';
      removeColor = 'rgba(255,255,255, 0.9)';
      removeBgColor = shadeColor(finalColor, 0.7);
    }
    chipStyle = `background:${finalColor};color:${textColor}`;
    removeStyle = `background:${removeBgColor};color:${removeColor}`;
  }
</script>

<button
  type="button"
  style={chipStyle}
  class={rootClasses}
  role={ariaRole}
  {disabled}
  tabindex={removable ? 0 : -1}
  on:click|preventDefault={() => {
    if (removable) {
      dispatch('click');
    }
  }}
>
  <div class="chip-label">{label}</div>
  {#if removable}
    <div style={removeStyle} class="chip-remove-button">
      <CloseIcon />
    </div>
  {/if}
</button>

<style>
  .st-chip {
    align-items: center;
    background-color: var(--st-gray-10);
    border: none;
    border-radius: 4px;
    color: var(--st-gray-90);
    cursor: pointer;
    display: inline-grid;
    flex-shrink: 0;
    grid-template-columns: min-content;
    height: 24px;
    line-height: 24px;
    overflow: hidden;
    padding: 8px;
    position: relative;
    text-align: left;
    white-space: nowrap;
    width: min-content;
  }

  .st-chip:disabled {
    cursor: not-allowed;
  }

  .st-chip.chip-removable:hover {
    background-color: var(--st-gray-20);
  }

  .st-chip.chip-removable:hover .chip-label {
    width: calc(100% - 20px);
  }

  .st-chip:hover .chip-remove-button {
    display: flex;
  }

  .chip-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chip-remove-button {
    align-items: center;
    background-color: var(--st-gray-30);
    color: var(--st-gray-100);
    display: none;
    height: 24px;
    justify-content: center;
    position: absolute;
    right: 0;
    top: 0;
    width: 24px;
  }
</style>
