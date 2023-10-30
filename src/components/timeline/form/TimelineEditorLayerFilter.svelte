<svelte:options immutable={true} />

<script lang="ts">
  import SearchIcon from '@nasa-jpl/stellar/icons/search.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { Layer } from '../../../types/timeline';
  import Input from '../../form/Input.svelte';
  import Menu from '../../menus/Menu.svelte';
  import MenuHeader from '../../menus/MenuHeader.svelte';

  export let layer: Layer;
  export let values: string[];
  export let options: string[];

  const dispatch = createEventDispatcher();

  let filterMenu: Menu;
  let input: HTMLInputElement;
  let filterString: string = '';
  let filteredValues: string[] = [];
  let menuTitle: string = '';
  let selectedValuesMap: Record<string, boolean> = {};

  $: if (layer) {
    selectedValuesMap = listToMap(values);
    if (layer.chartType === 'activity') {
      menuTitle = 'Activity Dictionary';
    } else if (layer.chartType === 'line') {
      menuTitle = 'Resource Types';
    } else if (layer.chartType === 'x-range') {
      menuTitle = 'Resource Types';
    }
  }

  $: if (filterString) {
    const filterStringLower = filterString.toLocaleLowerCase();
    filteredValues = options.filter(item => item.toLocaleLowerCase().indexOf(filterStringLower) > -1);
  } else {
    filteredValues = options.slice();
  }

  function listToMap(list: string[]): Record<string, boolean> {
    return list.reduce((map: Record<string, true>, item) => {
      if (!map[item]) {
        map[item] = true;
      }
      return map;
    }, {});
  }

  function selectFilteredValues() {
    const newValues = [...new Set([...values, ...filteredValues])];
    dispatch('change', { values: newValues });
  }

  function unselectFilteredValues() {
    const newValues: string[] = [];
    dispatch('change', { values: newValues });
  }

  function toggleItem(value: string) {
    let newValues = [];
    if (selectedValuesMap[value]) {
      newValues = values.filter(i => value !== i);
    } else {
      newValues = [...values, value];
    }
    dispatch('change', { values: newValues });
  }
</script>

<div class="timeline-editor-layer-filter" style="position: relative">
  <!-- TODO work out how to have focus also properly open the menu
  without stomping on click -->
  <Input>
    <input
      bind:this={input}
      bind:value={filterString}
      on:click|stopPropagation={() => {
        if (!filterMenu.isShown()) {
          filterMenu.show();
          input.focus();
        }
      }}
      autocomplete="off"
      class="st-input w-100"
      name="filter"
      placeholder={layer.chartType === 'activity' ? 'Search activities' : 'Search resources'}
    />
    <div class="filter-search-icon" slot="left"><SearchIcon /></div>
  </Input>
  <Menu hideAfterClick={false} bind:this={filterMenu} placement="bottom-start" on:hide={() => (filterString = '')}>
    <div class="menu-content">
      <MenuHeader title={menuTitle} />
      <div class="body st-typography-body">
        {#if filteredValues.length}
          <div class="values">
            {#each filteredValues as item}
              <button
                class="value st-button tertiary st-typography-body"
                on:click={() => toggleItem(item)}
                class:active={selectedValuesMap[item]}
              >
                {item}
              </button>
            {/each}
          </div>
        {:else}
          <div class="st-typography-label empty-state">No items matching filter</div>
        {/if}
      </div>
      <div class="list-buttons menu-border-top">
        <button class="st-button secondary list-button" on:click={selectFilteredValues}>
          Select {filteredValues.length}
          {#if filteredValues.length === 1}
            {layer.chartType === 'activity' ? 'activity' : 'resource'}
          {:else}
            {layer.chartType === 'activity' ? 'activities' : 'resources'}
          {/if}
        </button>
        <button class="st-button secondary list-button" on:click={unselectFilteredValues}>Unselect all</button>
      </div>
    </div>
  </Menu>
</div>

<style>
  .timeline-editor-layer-filter {
    display: flex;
  }

  .timeline-editor-layer-filter :global(.input) {
    z-index: 1;
  }

  .filter-search-icon {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
  }

  .menu-content {
    display: grid;
    grid-template-rows: min-content 1fr min-content;
    max-height: 360px;
  }

  .body {
    cursor: auto;
    display: grid;
    gap: 8px;
    overflow: auto;
    text-align: left;
  }

  .values {
    display: flex;
    flex-direction: column;
  }

  .value {
    border-radius: 0;
    justify-content: left;
    padding: 16px 8px;
  }

  .value:hover {
    background: var(--st-gray-20);
  }

  .value.active,
  .value.active:hover {
    background: #4fa1ff4f;
  }

  .body :global(.input-inline) {
    padding: 0;
  }

  .list-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    width: 100%;
  }

  .empty-state {
    margin: 8px;
  }

  .menu-border-top {
    border-top: 1px solid var(--st-gray-20);
  }
</style>
