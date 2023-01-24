<svelte:options immutable={true} />

<script lang="ts">
  import {
    schemeAccent,
    schemeCategory10,
    schemeDark2,
    schemePaired,
    schemePastel1,
    schemePastel2,
    schemeSet1,
    schemeSet2,
    schemeSet3,
    schemeTableau10,
  } from 'd3-scale-chromatic';
  import { createEventDispatcher } from 'svelte';
  import type { XRangeLayerColorScheme } from '../../types/timeline';
  import { tooltip } from '../../utilities/tooltip';
  import Menu from '../menus/Menu.svelte';

  export let value: string = 'schemeAccent';
  export let layout: 'compact' | 'dropdown' = 'dropdown';
  export let colors: readonly string[] = [];

  let pickerMenu: Menu;

  const dispatch = createEventDispatcher();

  const schemeMap: Record<XRangeLayerColorScheme, readonly string[]> = {
    schemeAccent,
    schemeCategory10,
    schemeDark2,
    schemePaired,
    schemePastel1,
    schemePastel2,
    schemeSet1,
    schemeSet2,
    schemeSet3,
    schemeTableau10,
  };

  const schemes: XRangeLayerColorScheme[] = Object.keys(schemeMap) as XRangeLayerColorScheme[];

  $: if (value) {
    colors = schemeMap[value] || schemeAccent;
  }

  function onInput(scheme: XRangeLayerColorScheme) {
    dispatch('input', { value: scheme });
  }
</script>

<button
  class="st-button color-scheme-picker"
  class:compact={layout === 'compact'}
  use:tooltip={{ content: 'Layer Color Scheme', placement: 'top' }}
  style="position: relative"
  on:click|stopPropagation={() => {
    pickerMenu.toggle();
  }}
>
  <div class="compact-bands">
    {#if layout === 'compact'}
      {#each colors.slice(0, 6) as color}
        <div class="compact-band" style="background:{color}" />
      {/each}
    {/if}
  </div>
  <Menu bind:this={pickerMenu} hideAfterClick={false} placement="bottom-end">
    <div class="header">
      <div class="title st-typography-small-caps">Color Schemes</div>
    </div>
    {#each schemes as scheme}
      <button class:active={scheme === value} class="st-button tertiary scheme-item" on:click={() => onInput(scheme)}>
        {#each schemeMap[scheme] as color}
          <div class="scheme-item-color" style="background:{color}" />
        {/each}
      </button>
    {/each}
  </Menu>
</button>

<style>
  .header {
    align-items: center;
    border-bottom: 1px solid var(--st-gray-20);
    color: var(--st-gray-40);
    cursor: auto;
    display: flex;
    justify-content: space-between;
    padding: 8px;
  }

  .title {
    color: var(--st-gray-40);
  }

  .compact {
    background: none;
    border-color: rgb(0 0 0 / 50%);
    height: 24px;
    min-width: 0;
    overflow: hidden;
    padding: 0;
    width: 24px;
  }

  .compact:hover {
    border-color: black;
  }

  .compact-band {
    flex: 1;
    height: inherit;
  }

  .compact-bands {
    display: flex;
    height: 100%;
    position: relative;
    width: 100%;
    z-index: 1;
  }

  .scheme-item {
    border-radius: 0;
    display: flex;
    gap: 2px;
    height: 32px;
    justify-content: left;
    padding: 8px;
    width: 100%;
  }

  .st-button.scheme-item:hover {
    background: var(--st-gray-20);
  }

  .scheme-item.active {
    background: #4fa1ff4f !important;
  }

  .scheme-item-color {
    border: 1px solid rgb(0, 0, 0, 24%);
    border-radius: 2px;
    height: 16px;
    width: 10px;
  }
</style>
