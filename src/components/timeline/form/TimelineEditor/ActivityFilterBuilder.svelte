<svelte:options immutable={true} />

<script lang="ts">
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import SearchIcon from '@nasa-jpl/stellar/icons/search.svg?component';
  import { createEventDispatcher } from 'svelte';
  import FilterWithPlusIcon from '../../../../assets/filter-with-plus.svg?component';
  import { activityArgumentDefaultsMap, activityDirectivesMap } from '../../../../stores/activities';
  import { activityTypes } from '../../../../stores/plan';
  import { spans } from '../../../../stores/simulation';
  import { tags } from '../../../../stores/tags';
  import type { ActivityLayerDynamicFilter, ActivityLayerFilter } from '../../../../types/timeline';
  import { compare } from '../../../../utilities/generic';
  import { applyActivityLayerFilter, getMatchingTypesForActivityLayerFilter } from '../../../../utilities/timeline';
  import { tooltip } from '../../../../utilities/tooltip';
  import Input from '../../../form/Input.svelte';
  import Menu from '../../../menus/Menu.svelte';
  import MenuHeader from '../../../menus/MenuHeader.svelte';
  import MenuItem from '../../../menus/MenuItem.svelte';
  import ActivityTypeResult from './ActivityTypeResult.svelte';
  import Draggable from './Draggable.svelte';
  import DynamicFilter from './DynamicFilter.svelte';

  export let filter: ActivityLayerFilter | undefined;

  let dirtyFilter: ActivityLayerFilter = filter
    ? structuredClone(filter)
    : { global_filters: [], dynamic_type_filters: [], static_types: [] };
  let manualInputOpen: boolean = false;
  let manualMenu: Menu;
  let rootRef: HTMLDivElement;
  let manualInputRef: HTMLInputElement;
  let shown: boolean = false;

  const dispatch = createEventDispatcher<{
    filterChange: { filter: ActivityLayerFilter };
  }>();

  export function toggle() {
    if (shown) {
      hide();
    } else {
      show();
    }
  }

  export function show() {
    shown = true;
  }

  export function hide() {
    shown = false;
  }

  function onManualTypeToggled(name: string) {
    const existingStaticTypes = dirtyFilter.static_types || [];
    let newStaticTypes = [];
    const checked = existingStaticTypes.indexOf(name) > -1;
    if (checked) {
      newStaticTypes = existingStaticTypes?.filter(t => t !== name);
    } else {
      newStaticTypes = existingStaticTypes.concat(name);
    }
    dirtyFilter = { ...dirtyFilter, static_types: newStaticTypes };
    dispatch('filterChange', { filter: dirtyFilter });
  }

  function onAddAllManualTypes() {
    dirtyFilter = { ...dirtyFilter, static_types: $activityTypes.map(t => t.name) };
    dispatch('filterChange', { filter: dirtyFilter });
  }

  function onRemoveAllManualTypes() {
    dirtyFilter = { ...dirtyFilter, static_types: [] };
    dispatch('filterChange', { filter: dirtyFilter });
  }

  function onAddDynamicFilter(list: 'dynamic_type_filters' | 'global_filters') {
    const field = list === 'dynamic_type_filters' ? 'Type' : 'Tag';
    const currentFilters = Array.isArray(dirtyFilter[list]) ? dirtyFilter[list] : [];
    dirtyFilter = {
      ...dirtyFilter,
      [list]: [...currentFilters, { field, operator: 'includes', value: '', id: Math.random() }],
    };
    dispatch('filterChange', { filter: dirtyFilter });
  }

  function onDynamicFilterChange(list: 'dynamic_type_filters' | 'global_filters', { detail: { filter } }: CustomEvent) {
    const currentFilters = Array.isArray(dirtyFilter[list]) ? dirtyFilter[list] : [];
    dirtyFilter = {
      ...dirtyFilter,
      [list]: currentFilters.map(f => {
        if (f.id === filter.id) {
          return filter;
        }
        return f;
      }),
    };
    dispatch('filterChange', { filter: dirtyFilter });
  }

  function onDynamicFilterRemove(
    list: 'dynamic_type_filters' | 'global_filters',
    filter: ActivityLayerDynamicFilter<any>,
  ) {
    const currentFilters = Array.isArray(dirtyFilter[list]) ? dirtyFilter[list] : [];
    dirtyFilter = {
      ...dirtyFilter,
      [list]: currentFilters.filter(f => {
        return f.id !== filter.id;
      }),
    };
    dispatch('filterChange', { filter: dirtyFilter });
  }

  $: activityDirectives = Object.values($activityDirectivesMap);
  $: appliedFilter = applyActivityLayerFilter(
    dirtyFilter,
    activityDirectives,
    $spans,
    $activityTypes,
    $activityArgumentDefaultsMap,
  );
  $: resultingTypes = new Set(appliedFilter.directives.map(d => d.type).concat(appliedFilter.spans.map(s => s.type)));
  $: matchingTypes = getMatchingTypesForActivityLayerFilter(dirtyFilter, $activityTypes);
  // TODO need to get the list of matching types and then grab the actual applied filter
  $: allParameterTypes = $activityTypes.reduce((acc, activityType) => {
    Object.entries(activityType.parameters).forEach(([parameterName, parameter]) => {
      const parameterType = parameter.schema.type;
      // TODO support series and struct?
      if (parameterType === 'series' || parameterType === 'struct') {
        return;
      }
      const key = `${parameterName} (${parameterType})`;
      const matchingName = !!acc[parameterType];
      const matchingType = matchingName && acc[parameterType].parameter.type === parameterType;
      if (!matchingName || !matchingType) {
        const values = parameterType === 'variant' ? parameter.schema.variants.map(variant => variant.key) : null;
        acc[key] = {
          name: parameterName,
          type: parameterType,
          ...(values ? { values } : null),
          label: `${parameterName} (${parameterType})`,
        };
      }
    });
    return acc;
  }, {});

  $: parameterSubfields = Object.values(allParameterTypes).sort((a, b) => compare(a.label, b.label));
  // TODO support key/value for values array

  $: if (manualInputOpen) {
    manualMenu?.show();
  } else {
    manualMenu?.hide();
  }
</script>

<div bind:this={rootRef}>
  {#if shown}
    <!-- TODO maybe pass in dimensions? -->
    <Draggable
      className="st-menu activity-filter-builder"
      initialWidth={1000}
      initialHeight={500}
      dragOptions={{
        // TODO activityfilterbuilder props for initial dimensions?
        defaultPosition: {
          x: (rootRef?.getBoundingClientRect().x ?? 0) - 1000,
          y: (rootRef?.getBoundingClientRect().y ?? 0) - 250,
        },
      }}
    >
      <div slot="handle">
        <MenuHeader title="Activity Filters">
          <button on:click|stopPropagation={hide} class="st-button icon">
            <CloseIcon />
          </button>
        </MenuHeader>
      </div>
      <div class="body">
        <div class="filters">
          <div class="filter-section">
            <div class="filter-section-header st-typography-medium">
              Manually Select Types
              <button on:click={onRemoveAllManualTypes} class="st-button icon" use:tooltip={{ content: 'Remove Type' }}>
                <CloseIcon />
              </button>
            </div>
            <div class="filter-section-content filter-section-content-bordered">
              <Input>
                <div class="search-icon" slot="left"><SearchIcon /></div>
                <input
                  bind:this={manualInputRef}
                  class="st-input w-100 manual-types-filter-input"
                  placeholder="Select types"
                  value=""
                  on:click={() => {
                    requestAnimationFrame(() => {
                      if (!manualInputOpen) {
                        manualInputOpen = true;
                      }
                    });
                  }}
                />
              </Input>
              <!-- TODO input menu not getting current size after resize -->
              <div style:position="relative" style:width="0px">
                <Menu
                  width={manualInputRef?.clientWidth ?? 600}
                  hideAfterClick={false}
                  placement="right-start"
                  bind:this={manualMenu}
                  on:hide={() => (manualInputOpen = false)}
                >
                  <div class="manual-types-menu">
                    <MenuItem on:click={() => onAddAllManualTypes()}>
                      <div class="st-typography-bold manual-types-add-all">Add All +</div>
                    </MenuItem>
                    {#each $activityTypes as type}
                      <MenuItem on:click={() => onManualTypeToggled(type.name)}>
                        <input type="checkbox" checked={(dirtyFilter.static_types || []).indexOf(type.name) > -1} />
                        <div class="st-typography-body">{type.name}</div>
                      </MenuItem>
                    {/each}
                  </div>
                </Menu>
              </div>
              {#if dirtyFilter.static_types?.length}
                <div class="manual-types-results">
                  {#each dirtyFilter.static_types as name}
                    <ActivityTypeResult {name} on:remove={() => onManualTypeToggled(name)} />
                  {/each}
                </div>
              {/if}
            </div>
          </div>
          <div class="filter-section">
            <div class="filter-section-header st-typography-medium">
              <div class="filter-section-title">
                Dynamically Select Types
                <div class="hint st-typography-body">Name includes...</div>
              </div>
              <button
                class="st-button icon"
                on:click={() => onAddDynamicFilter('dynamic_type_filters')}
                use:tooltip={{ content: 'Add Filter' }}
              >
                <FilterWithPlusIcon />
              </button>
            </div>
            {#if dirtyFilter.dynamic_type_filters?.length}
              <div class="filter-section-content">
                <div class="dynamic-filter-content">
                  {#each dirtyFilter.dynamic_type_filters as filter, i (filter.id)}
                    <DynamicFilter
                      {filter}
                      on:remove={() => onDynamicFilterRemove('dynamic_type_filters', filter)}
                      on:change={event => onDynamicFilterChange('dynamic_type_filters', event)}
                      verb={i === 0 ? 'Where' : 'and'}
                      schema={{
                        /* TODO include only subsystem tags */
                        Name: {
                          does_not_equal: { type: 'string' },
                          does_not_include: { type: 'string' },
                          equals: { type: 'variant', values: $activityTypes.map(type => type.name) },
                          includes: { type: 'string' },
                        },
                        Subsystem: {
                          does_not_include: { type: 'tag', values: $tags },
                          includes: { type: 'tag', values: $tags },
                        },
                        Type: {
                          does_not_equal: { type: 'variant', values: $activityTypes.map(type => type.name) },
                          does_not_include: { type: 'string' },
                          equals: { type: 'variant', values: $activityTypes.map(type => type.name) },
                          includes: { type: 'string' },
                        },
                      }}
                    />
                  {/each}
                </div>
              </div>
            {/if}
          </div>
          <div class="filter-section">
            <div class="filter-section-header st-typography-medium">
              <div class="filter-section-title">
                Global Filters
                <div class="hint st-typography-body">Tag, parameter, scheduling goal, etc...</div>
              </div>
              <button
                class="st-button icon"
                on:click={() => onAddDynamicFilter('global_filters')}
                use:tooltip={{ content: 'Add Filter' }}
              >
                <FilterWithPlusIcon />
              </button>
            </div>
            {#if dirtyFilter.global_filters?.length}
              <div class="filter-section-content">
                <div class="dynamic-filter-content">
                  {#each dirtyFilter.global_filters as filter, i (filter.id)}
                    <DynamicFilter
                      {filter}
                      on:remove={() => onDynamicFilterRemove('global_filters', filter)}
                      on:change={event => onDynamicFilterChange('global_filters', event)}
                      verb={i === 0 ? 'Where' : 'and'}
                      schema={{
                        Parameter: {
                          subfields: parameterSubfields,
                        },
                        Tag: {
                          does_not_include: { type: 'tag', values: $tags },
                          includes: { type: 'tag', values: $tags },
                        },
                      }}
                    />
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
        <div class="resulting-types">
          <div class="resulting-types-title st-typography-medium">Resulting Types</div>
          <Input>
            <div class="search-icon" slot="left"><SearchIcon /></div>
            <input class="st-input w-100" placeholder="Select types" value="" />
          </Input>
          <div class="resulting-types-list">
            {#each matchingTypes as type}
              <ActivityTypeResult name={type.name} removable={false} />
            {/each}
          </div>
        </div>
      </div>
    </Draggable>
  {/if}
</div>

<style>
  :global(.activity-filter-builder) {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 90vh;
    max-width: 95vw;
    min-height: 400px;
    min-width: 600px;
    width: 100%;
  }

  :global(.activity-filter-builder .header) {
    cursor: inherit;
  }

  .body {
    /* background: var(--st-gray-15); */
    background: #f7f7f8; /* TODO: color not in design system */
    display: flex;
    flex: 1;
    height: inherit;
    overflow: hidden;
  }

  .filter-section {
    background: white;
    border: 1px solid var(--st-gray-20);
    border-radius: 4px;
  }

  .filter-section-header {
    align-items: center;
    display: flex;
    height: 40px;
    justify-content: space-between;
    padding: 16px 8px;
  }

  .filter-section-title {
    display: flex;
    gap: 8px;
    user-select: none;
  }

  .filter-section-title .hint {
    opacity: 0.5;
  }

  .filter-section-content {
    padding: 0px 8px 8px;
  }

  .filter-section-content-bordered {
    border-top: 1px solid var(--st-gray-20);
    padding: 8px;
  }

  .filters {
    display: flex;
    flex: 70%;
    flex-direction: column;
    gap: 8px;
    overflow: auto;
    padding: 8px;
  }

  .resulting-types {
    background: white;
    display: flex;
    flex: 30%;
    flex-direction: column;
    overflow: hidden;
    padding: 8px;
  }

  .resulting-types input {
    background: white;
  }

  .resulting-types-title {
    display: flex;
    padding-bottom: 8px;
  }

  .resulting-types-list {
    margin-top: 8px;
    overflow: auto;
  }

  .manual-types-menu {
    --aerie-menu-item-padding: 8px;
    cursor: pointer;
    max-height: 320px;
    overflow: auto;
    width: 100%;
  }

  .manual-types-add-all {
    align-items: center;
    display: flex;
    font-style: italic;
    height: 16px;
    padding-left: 24px;
  }

  .manual-types-filter-input {
    background: white;
  }

  .manual-types-menu input {
    margin: 0;
  }

  .manual-types-results {
    margin-top: 8px;
    max-height: 200px;
    overflow: auto;
  }
  .dynamic-filter-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 200px;
    overflow: auto;
  }

  .search-icon {
    align-items: center;
    color: var(--st-gray-50);
    display: flex;
  }
</style>
