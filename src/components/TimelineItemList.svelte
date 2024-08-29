<svelte:options immutable={true} />

<script lang="ts">
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import GripVerticalIcon from 'bootstrap-icons/icons/grip-vertical.svg?component';
  import { capitalize } from 'lodash-es';
  import PlusCircledIcon from '../assets/plus-circled.svg?component';
  import { view, viewAddFilterToRow } from '../stores/views';
  import type {
    ChartType,
    Layer,
    Row,
    Timeline,
    TimelineItemListFilterOption,
    TimelineItemType,
  } from '../types/timeline';
  import { tooltip } from '../utilities/tooltip';
  import Input from './form/Input.svelte';
  import LayerPicker from './LayerPicker.svelte';
  import Menu from './menus/Menu.svelte';
  import ListItem from './ui/ListItem.svelte';
  import Tag from './ui/Tags/Tag.svelte';

  export let chartType: ChartType = 'activity';
  export let typeName: 'activity' | 'resource' = 'activity';
  export let typeNamePlural: 'Activities' | 'Resources' = 'Activities';
  export let items: TimelineItemType[] = [];
  export let filterOptions: TimelineItemListFilterOption[] = [];
  export let filterName: string = 'Filter';
  export let getFilterValueFromItem: (item: TimelineItemType) => string;

  let menu: Menu;
  let filteredItems: TimelineItemType[] = [];
  let textFilters: string[] = [];
  let selectedFilters: Record<string, TimelineItemListFilterOption> = {};
  let filterText: string = '';
  let layerPicker: LayerPicker;
  let layerPickerIndividual: LayerPicker;
  let timelines: Timeline[] = [];

  $: filteredItems = filterItems(items, filterText ? textFilters.concat(filterText) : textFilters, selectedFilters);
  $: timelines = $view?.definition.plan.timelines || [];

  function filterItems(
    items: TimelineItemType[],
    textFilters: string[],
    selectedFilterOptions: Record<string, TimelineItemListFilterOption>,
  ) {
    return items.filter(item => {
      const name = item.name;
      const itemFilterValue = getFilterValueFromItem(item);
      let matchesText = true;
      let matchesFilter = true;
      for (let i = 0; i < textFilters.length; i++) {
        const textFilter = textFilters[i];
        if (!name.toLowerCase().includes(textFilter.toLowerCase())) {
          matchesText = false;
        }
      }
      if (Object.keys(selectedFilterOptions).length > 0) {
        if (!itemFilterValue) {
          matchesFilter = false;
        } else {
          matchesFilter = !!selectedFilterOptions[itemFilterValue];
        }
      }
      return matchesText && matchesFilter;
    });
  }

  function onDragEnd(): void {
    document.getElementById('list-item-drag-image')?.remove();
  }

  function onDragStart(event: DragEvent, items: TimelineItemType[]): void {
    const dragImage = document.createElement('div');
    const text = document.createTextNode(
      items.length === 1 ? items[0].name : `${typeNamePlural} (${filteredItems.length})`,
    );
    dragImage.appendChild(text);
    dragImage.id = 'list-item-drag-image';
    dragImage.style.padding = '8px 20px';
    dragImage.style.color = 'rgba(0, 0, 0, 0.8)';
    dragImage.style.background = 'var(--st-gray-10)';
    dragImage.style.width = 'min-content';
    dragImage.style.borderRadius = '4px';
    dragImage.style.border = '1px solid var(--st-gray-30)';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.whiteSpace = 'nowrap';
    dragImage.className = 'st-typography-medium';
    document.body.appendChild(dragImage);
    if (event.dataTransfer) {
      event.dataTransfer.setDragImage(dragImage, 0, 0);
      event.dataTransfer.setData('text/plain', JSON.stringify({ items, type: typeName }));
      event.dataTransfer.dropEffect = typeName === 'activity' ? 'copy' : 'link';
      event.dataTransfer.effectAllowed = typeName === 'activity' ? 'copyLink' : 'link';
    }
  }

  function addTextFilter() {
    if (filterText && textFilters.indexOf(filterText) < 0) {
      textFilters = textFilters.concat(filterText);
    }
    filterText = '';
  }

  function onInputKeydown(event: KeyboardEvent) {
    const { key } = event;
    if (key === 'Enter') {
      addTextFilter();
    }
  }

  function onBulkLayerPicked(event: CustomEvent<{ layer?: Layer; row?: Row }>) {
    addTextFilter();
    viewAddFilterToRow(filteredItems, typeName, event.detail.row?.id, event.detail.layer);
  }

  function onBulkAddToRow(e: MouseEvent) {
    e.stopPropagation();
    addTextFilter();
    layerPicker.toggle(e);
  }

  function onIndividualLayerPicked(event: CustomEvent<{ item?: TimelineItemType; layer?: Layer; row?: Row }>) {
    if (event.detail.item) {
      viewAddFilterToRow([event.detail.item], typeName, event.detail.row?.id, event.detail.layer);
    }
  }

  function onFilterIndividualItem(e: MouseEvent, item: TimelineItemType) {
    e.stopPropagation();
    layerPickerIndividual.toggle(e, item);
  }
</script>

<div class="timeline-item-list">
  <div class="timeline-item-list-filters">
    <input
      bind:value={filterText}
      on:keydown={onInputKeydown}
      class="st-input"
      name="search"
      autocomplete="off"
      placeholder="Filter {typeName} types"
    />
    <div style="position: relative">
      <button
        class="st-button secondary menu-button"
        style="position: relative; z-index: 1"
        on:click|stopPropagation={() => menu.toggle()}
      >
        {filterName}
        <ChevronDownIcon />
      </button>
      <Menu bind:this={menu} hideAfterClick={false} placement="bottom-end">
        <div class="timeline-item-list-filter-options">
          {#if !filterOptions.length}
            <div>No {filterName}s found</div>
          {/if}
          {#each filterOptions as option}
            <Input layout="inline" class="timeline-item-list-filter-option">
              <label class="st-typography-body timeline-item-list-filter-option-label" for={option.value}>
                {#if option.color}
                  <div class="color" style:background={option.color} />
                {/if}
                {option.label}
              </label>
              <input
                checked={!!selectedFilters[option.value.toString()]}
                id={option.value}
                name={option.value}
                on:change={() => {
                  if (selectedFilters[option.value]) {
                    delete selectedFilters[option.value];
                  } else {
                    selectedFilters[option.value] = option;
                  }
                  selectedFilters = { ...selectedFilters };
                }}
                type="checkbox"
              />
            </Input>
          {/each}
        </div>
      </Menu>
    </div>
  </div>

  <div class="controls">
    <div class="controls-header st-typography-medium">
      <div>{typeNamePlural} ({filteredItems.length})</div>
      <div>
        <button class="st-button secondary" on:click={onBulkAddToRow}> Add Filter to Row </button>
        <LayerPicker
          bind:this={layerPicker}
          rows={timelines[0]?.rows || []}
          {chartType}
          on:select={onBulkLayerPicked}
        />
      </div>
    </div>
    <div
      class="filters st-typography-label"
      role="none"
      draggable={true}
      on:dragend={() => onDragEnd()}
      on:dragstart={e => onDragStart(e, filteredItems)}
    >
      <div class="filters-row">
        {#if textFilters.length === 0 && Object.keys(selectedFilters).length === 0 && !filterText}
          <Tag tag={{ id: -1, name: `All ${typeNamePlural}` }} removable={false} />
        {:else}
          {#each textFilters as filter, i}
            <Tag
              tag={{ id: i, name: filter }}
              on:click={() => {
                textFilters = textFilters.filter(f => f !== filter);
              }}
            />
          {/each}
          {#each Object.values(selectedFilters) as selectedFilter}
            <!-- TODO maybe pull the tag instead of recreating it? -->
            <Tag
              tag={{ color: selectedFilter.color, id: parseInt(selectedFilter.value), name: selectedFilter.label }}
              on:click={() => {
                delete selectedFilters[selectedFilter.value];
                selectedFilters = { ...selectedFilters };
              }}
            />
          {/each}
        {/if}
        {#if filterText}
          <i class="filter-hint">Press enter to apply "{filterText}"</i>
        {/if}
      </div>
      <div class="drag">
        <GripVerticalIcon />
      </div>
    </div>
  </div>

  <div class="list-items">
    {#if filteredItems.length}
      {#each filteredItems as item}
        <ListItem
          draggable
          style="cursor: move;"
          on:dragend={onDragEnd}
          on:dragstart={e => onDragStart(e.detail, [item])}
        >
          {item.name}
          <slot prop={item} />
          <span slot="suffix">
            <div use:tooltip={{ content: 'Add Filter to Row', placement: 'top' }}>
              <button
                aria-label="Add{capitalize(typeName)}-{item.name}"
                class="st-button icon"
                on:click={e => onFilterIndividualItem(e, item)}
              >
                <PlusCircledIcon />
              </button>
            </div>
            <div class="drag">
              <GripVerticalIcon />
            </div>
          </span>
        </ListItem>
      {/each}
      <LayerPicker
        bind:this={layerPickerIndividual}
        rows={timelines[0].rows || []}
        {chartType}
        on:select={onIndividualLayerPicked}
      />
    {/if}
  </div>
</div>

<style>
  .timeline-item-list {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .timeline-item-list-filters {
    align-items: center;
    display: flex;
    gap: 8px;
    padding: 8px 8px;
    position: relative;
  }

  .timeline-item-list-filters :global(.st-input) {
    flex: 1;
  }

  .filters {
    display: flex;
    gap: 8px;
    justify-content: space-between;
    min-height: 28px;
    padding: 4px 8px;
  }

  .filter-hint {
    overflow-wrap: break-word;
    padding-left: 4px;
    width: 100%;
  }

  .filters-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: calc(100% - 32px);
  }

  .menu-button {
    gap: 4px;
    position: relative;
    z-index: 1;
  }

  .color {
    border-radius: 2px;
    flex-shrink: 0;
    height: 16px;
    margin-right: 8px;
    position: relative;
    width: 16px;
  }

  .color:after {
    border: 1px solid rgb(0 0 0 / 25%);
    border-radius: 2px;
    content: ' ';
    height: 100%;
    left: 0;
    pointer-events: none;
    position: absolute;
    top: 0;
    width: 100%;
    z-index: 1;
  }

  :global(.timeline-item-list-filter-options) {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    position: relative;
  }

  :global(.input.input-inline.timeline-item-list-filter-option) {
    display: flex;
    flex-direction: row-reverse;
    gap: 12px;
    justify-content: flex-end;
    padding: 0;
  }

  :global(.input.input-inline.timeline-item-list-filter-option input) {
    margin: 0;
  }

  .timeline-item-list-filter-option-label {
    align-items: center;
    display: flex;
    flex: 1;
    user-select: none;
  }

  .controls {
    background: rgba(248, 248, 248, 0.6);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    margin: 4px;
  }

  .controls-header {
    align-items: center;
    display: flex;
    gap: 8px;
    height: 32px;
    padding: 4px 12px;
  }

  .controls-header > div:first-child {
    flex: 1;
  }

  .controls-header .st-button {
    gap: 4px;
    height: 20px;
  }

  .list-items {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .list-items {
    overflow: auto;
  }

  .drag {
    align-items: center;
    cursor: move;
    display: flex;
    justify-content: center;
    width: 24px;
  }
</style>
