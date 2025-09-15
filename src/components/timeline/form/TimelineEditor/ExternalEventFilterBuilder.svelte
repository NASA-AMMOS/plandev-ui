<svelte:options immutable={true} />

<script lang="ts">
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import SearchIcon from '@nasa-jpl/stellar/icons/search.svg?component';
  import TagIcon from '@nasa-jpl/stellar/icons/tag.svg?component';
  import { createEventDispatcher } from 'svelte';
  import ExternalEventIcon from '../../../../assets/external-event-box-with-arrow.svg?component';
  import FilterWithPlusIcon from '../../../../assets/filter-with-plus.svg?component';
  import { externalEventsMap, externalEventTypes } from '../../../../stores/external-event';
  import type { ExternalEventType } from '../../../../types/external-event';
  import type { ExternalEventLayerFilter, ExternalEventLayerFilterSubfieldSchema } from '../../../../types/timeline';
  import { compare, getTarget, lowercase } from '../../../../utilities/generic';
  import { pluralize } from '../../../../utilities/text';
  import {
    applyExternalEventLayerFilter,
    getMatchingTypesForExternalEventLayerFilter,
    getNextThingID,
  } from '../../../../utilities/timeline';
  import { tooltip } from '../../../../utilities/tooltip';
  import Input from '../../../form/Input.svelte';
  import Menu from '../../../menus/Menu.svelte';
  import MenuHeader from '../../../menus/MenuHeader.svelte';
  import MenuItem from '../../../menus/MenuItem.svelte';
  import CssGrid from '../../../ui/CssGrid.svelte';
  import CssGridGutter from '../../../ui/CssGridGutter.svelte';
  import Draggable from './Draggable.svelte';
  import DynamicFilter from './DynamicFilter.svelte';
  import FilterTypeResult from './FilterTypeResult.svelte';

  export let filter: ExternalEventLayerFilter | undefined;
  export const filterWidth = 1000;
  export const filterHeight = 500;
  export let layerName: string = '';

  let parameterSubfields: ExternalEventLayerFilterSubfieldSchema[] = [];
  // TODO: Match this type to the activities one?
  let dirtyFilter: ExternalEventLayerFilter = {
    dynamic_type_filters: [],
    other_filters: [],
    static_types: [],
    type_subfilters: {},
  };
  let manualInputOpen: boolean = false;
  let manualMenu: Menu;
  let resultingTypesMessage: string = '';
  let rootRef: HTMLDivElement;
  let manualInputRef: HTMLInputElement;
  let manualInputWidth: number = 600;
  let manualInputValue: string = '';
  let resultingTypesInputValue: string = '';
  let shown: boolean = false;
  let instanceCount: number = 0;

  const dispatch = createEventDispatcher<{
    filterChange: { filter: ExternalEventLayerFilter };
    rename: { name: string };
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
    dirtyFilter = { ...dirtyFilter, static_types: filteredExternalEventTypes.map(t => t.name) };
    dispatch('filterChange', { filter: dirtyFilter });
  }

  function onRemoveAllManualTypes() {
    dirtyFilter = { ...dirtyFilter, static_types: [] };
    dispatch('filterChange', { filter: dirtyFilter });
  }

  function onAddDynamicFilter(list: 'dynamic_type_filters' | 'other_filters') {
    const field = list === 'dynamic_type_filters' ? 'Type' : 'Tags';
    const listObj = dirtyFilter[list] || [];
    const currentFilters = Array.isArray(listObj) ? listObj : [];
    const id = getNextThingID(listObj);
    dirtyFilter = {
      ...dirtyFilter,
      [list]: [...currentFilters, { field, id, operator: 'includes', value: '' }],
    };
    dispatch('filterChange', { filter: dirtyFilter });
  }

  function onDynamicFilterChange(list: 'dynamic_type_filters' | 'other_filters', { detail: { filter } }: CustomEvent) {
    const currentFilters = Array.isArray(dirtyFilter[list]) ? dirtyFilter[list] : [];
    dirtyFilter = {
      ...dirtyFilter,
      [list]: (currentFilters || []).map(f => {
        if (f.id === filter.id) {
          return filter;
        }
        return f;
      }),
    };
    dispatch('filterChange', { filter: dirtyFilter });
  }

  function onDynamicFilterRemove(list: 'dynamic_type_filters' | 'other_filters', id: number) {
    const currentFilters: ExternalEventLayerFilter['dynamic_type_filters'] | ExternalEventLayerFilter['other_filters'] =
      Array.isArray(dirtyFilter[list]) ? dirtyFilter[list] : [];
    dirtyFilter = {
      ...dirtyFilter,
      // TODO unsure how to resolve the svelte ts check errors if these basic types here don't exist
      [list]: ((currentFilters as { id: number }[]) || []).filter((f: { id: number }) => {
        return f.id !== id;
      }),
    };
    dispatch('filterChange', { filter: dirtyFilter });
  }

  function onTypeSubfilterChange(type: string, { detail: { filter } }: CustomEvent) {
    const typeSubfilters = dirtyFilter.type_subfilters || {};
    const currentFilters = typeSubfilters[type];
    dirtyFilter = {
      ...dirtyFilter,
      type_subfilters: {
        ...typeSubfilters,
        [type]: currentFilters.map(f => {
          if (f.id === filter.id) {
            return filter;
          }
          return f;
        }),
      },
    };
    dispatch('filterChange', { filter: dirtyFilter });
  }

  function onTypeSubfilterRemove(type: string, id: number) {
    const typeSubfilters = dirtyFilter.type_subfilters || {};
    const currentFilters = typeSubfilters[type];
    const newFilters = currentFilters.filter(f => f.id !== id);
    dirtyFilter = {
      ...dirtyFilter,
      type_subfilters: {
        ...typeSubfilters,
        [type]: newFilters,
      },
    };
    if (dirtyFilter.type_subfilters && newFilters.length === 0) {
      delete dirtyFilter.type_subfilters[type];
    }
    dispatch('filterChange', { filter: dirtyFilter });
  }

  function onAddTypeSubfilter(type: string) {
    const typeSubfilters = dirtyFilter.type_subfilters || {};
    if (!typeSubfilters[type]) {
      typeSubfilters[type] = [];
    }
    const currentFilters = typeSubfilters[type];
    const id = getNextThingID(currentFilters);
    dirtyFilter = {
      ...dirtyFilter,
      type_subfilters: {
        ...typeSubfilters,
        [type]: [...currentFilters, { field: 'Name', id, operator: 'includes', value: '' }],
      },
    };
    dispatch('filterChange', { filter: dirtyFilter });
  }

  $: if (filter) {
    dirtyFilter = structuredClone(filter);
  }

  $: externalEvents = Object.values($externalEventsMap || {});
  $: appliedFilter = applyExternalEventLayerFilter(dirtyFilter, externalEvents);

  // TODO: This was doing a lot before and I don't think it needs to be
  $: if (appliedFilter) {
    instanceCount = appliedFilter.externalEvents.length;
  }

  $: matchingTypes = getMatchingTypesForExternalEventLayerFilter(dirtyFilter, $externalEventTypes);
  $: filteredMatchingTypes = matchingTypes.filter(type => {
    if (!resultingTypesInputValue) {
      return true;
    }

    return lowercase(type.name).indexOf(lowercase(resultingTypesInputValue)) > -1;
  });

  $: {
    const allParameterTypes = (matchingTypes.length ? matchingTypes : $externalEventTypes).reduce(
      (acc: Record<string, ExternalEventLayerFilterSubfieldSchema>, externalEventType) => {
        Object.entries(externalEventType.attribute_schema.properties).forEach(
          ([parameterName, parameterDefinition]) => {
            const casted: any = parameterDefinition as any; // it has to be casted _somehow_, because it comes in necessarily as unknown but at most it is an any
            let parameterType = casted.type;
            // TODO support series and struct?
            if (parameterType === 'series' || parameterType === 'struct') {
              return;
            }
            if (parameterType === undefined && !!casted.enum) {
              parameterType = 'enum';
            }
            const key = `${parameterName} (${parameterType})`;
            const matchingName = !!acc[key];
            const matchingEntry = matchingName && acc[key].type === parameterType;
            if (matchingEntry) {
              acc[key].externalEventTypes.push(externalEventType.name);
              switch (parameterType) {
                case 'enum':
                  handleEnumAttribute(acc, parameterName, parameterDefinition, externalEventType);
                  break;
                case 'object':
                  recurseObjectAttributeProperties(acc, casted.properties, parameterName, externalEventType);
                  break;
                default:
                  acc[key].externalEventTypes.push(externalEventType.name);
              }
            }
            if (!matchingEntry) {
              switch (parameterType) {
                case 'enum':
                  handleEnumAttribute(acc, parameterName, parameterDefinition, externalEventType);
                  break;
                case 'object':
                  recurseObjectAttributeProperties(acc, casted.properties, parameterName, externalEventType);
                  break;
                default:
                  acc[key] = {
                    externalEventTypes: [externalEventType.name],
                    label: `${parameterName} (${parameterType})`,
                    name: parameterName,
                    type: parameterType,
                  };
              }
            }
          },
        );
        return acc;
      },
      {},
    );
    // TODO support key/value for values array?
    parameterSubfields = Object.values(allParameterTypes).sort((a, b) => compare(a.label, b.label));
  }

  $: filteredExternalEventTypes = $externalEventTypes.filter(type => {
    if (!manualInputValue) {
      return true;
    }

    return lowercase(type.name).indexOf(lowercase(manualInputValue)) > -1;
  });

  $: if (manualInputOpen) {
    manualMenu?.show();
  } else {
    manualMenu?.hide();
  }

  $: {
    const noFiltersApplied =
      !filter ||
      (!filter.dynamic_type_filters?.length && !filter.other_filters?.length && !filter.static_types?.length);

    if (matchingTypes.length && !filteredMatchingTypes.length) {
      resultingTypesMessage = `No types matching "${resultingTypesInputValue}"`;
    } else if (!matchingTypes.length && !noFiltersApplied) {
      resultingTypesMessage = 'No types matching your filter';
    } else {
      resultingTypesMessage = '';
    }
  }

  function handleEnumAttribute(
    acc: Record<string, ExternalEventLayerFilterSubfieldSchema>,
    parameterName: string,
    variants: any,
    externalEventType: ExternalEventType,
  ) {
    const matchingName = !!acc[parameterName];
    const matchingEntry = matchingName && acc[parameterName].type === 'variant';
    if (matchingEntry) {
      // handle enums too?
      acc[parameterName].externalEventTypes.push(externalEventType.name);
    }
    if (!matchingEntry) {
      acc[parameterName] = {
        externalEventTypes: [externalEventType.name],
        label: parameterName,
        name: parameterName,
        type: 'variant',
        values: variants.enum,
      };
    }
  }

  function recurseObjectAttributeProperties(
    acc: Record<string, ExternalEventLayerFilterSubfieldSchema>,
    properties: any,
    parameterName: string,
    externalEventType: ExternalEventType,
  ) {
    let props: [string, any][] = Object.entries(properties);
    props.forEach(prop => {
      if (prop[1].properties) {
        recurseObjectAttributeProperties(acc, prop[1].properties, `${parameterName} -> ${prop[0]}`, externalEventType);
      } else {
        const key = `${parameterName} -> ${prop[0]}`;
        let type = prop[1].type;
        if (type === undefined && !!prop[1].enum) {
          type = 'enum';
        }
        const matchingName = !!acc[key];
        const matchingEntry = matchingName && acc[key].type === type;
        if (matchingEntry) {
          // handle enums too?
          acc[key].externalEventTypes.push(externalEventType.name);
        }
        if (!matchingEntry) {
          if (type !== 'enum') {
            acc[key] = {
              externalEventTypes: [externalEventType.name],
              label: `${key} (${type})`,
              name: key,
              type: type,
            };
          } else {
            handleEnumAttribute(acc, `${parameterName} -> ${prop[0]}`, prop[1], externalEventType);
          }
        }
      }
    });
  }

  function onLayerNameChange(event: Event) {
    const { value } = getTarget(event);
    dispatch('rename', { name: value as string });
  }

  function getDefaultPosition() {
    if (!rootRef) {
      return { x: 0, y: 0 };
    }
    const { x, y, width, height } = rootRef.getBoundingClientRect();
    let defaultX = 0;
    let defaultY = 0;
    const padding = 16;

    if (x - filterWidth > padding / 2) {
      defaultX = x - filterWidth - padding / 2;
    } else if (x + width + filterWidth < document.body.clientWidth - padding / 2) {
      defaultX = x + width + padding / 2;
    } else {
      defaultX = Math.max(0, document.body.clientWidth / 2 - filterWidth / 2);
    }

    if (y - filterHeight / 2 > padding && y + filterHeight < document.body.clientHeight - padding) {
      defaultY = y - filterHeight / 2;
    } else if (y + filterHeight < document.body.clientHeight - padding) {
      // Show below
      defaultY = y;
    } else if (y + height - filterHeight > padding) {
      // Show above
      defaultY = y + height - filterHeight;
    } else {
      defaultY = Math.max(0, document.body.clientHeight / 2 - filterHeight / 2);
    }

    return {
      x: defaultX,
      y: defaultY,
    };
  }
</script>

<div bind:this={rootRef} class="w-full" style:display="grid">
  <slot name="trigger" />
  {#if shown}
    <Draggable
      className="st-menu external-event-filter-builder"
      initialWidth={filterWidth}
      initialHeight={filterHeight}
      dragOptions={{ defaultPosition: getDefaultPosition() }}
    >
      <div slot="handle">
        <MenuHeader title="External Event Filtering">
          <input
            slot="left"
            value={layerName}
            autocomplete="off"
            class="st-input cancel-drag"
            name="layer-name"
            aria-label="layer-name"
            placeholder="Enter a name for this filter..."
            style="width: 220px"
            on:input={onLayerNameChange}
          />
          <button on:click|stopPropagation={hide} class="st-button icon" aria-label="close">
            <CloseIcon />
          </button>
        </MenuHeader>
      </div>
      <div class="body">
        <CssGrid columns="0.7fr 3px 0.3fr" columnMinSizes={{ 0: 500, 1: 3, 2: 300 }} class="external-event-filter-grid">
          <div class="filters">
            <div class="filter-section" aria-label="manual-types">
              <div class="filter-section-header st-typography-medium">
                Manually Select Types
                {#if dirtyFilter.static_types?.length}
                  <button
                    on:click={onRemoveAllManualTypes}
                    class="st-button icon"
                    use:tooltip={{ content: 'Remove Types' }}
                  >
                    <CloseIcon />
                  </button>
                {/if}
              </div>
              <div class="filter-section-content filter-section-content-bordered">
                <div bind:clientWidth={manualInputWidth}>
                  <Input>
                    <div class="search-icon" slot="left"><SearchIcon /></div>
                    <input
                      autocomplete="off"
                      bind:this={manualInputRef}
                      name="manual-types-filter-input"
                      class="st-input manual-types-filter-input w-full"
                      placeholder="Select types"
                      bind:value={manualInputValue}
                      on:click={() => {
                        requestAnimationFrame(() => {
                          if (!manualInputOpen) {
                            manualInputOpen = true;
                          }
                        });
                      }}
                    />
                  </Input>
                </div>
                <div style:position="relative" style:width="0px">
                  <Menu
                    width={manualInputWidth}
                    hideAfterClick={false}
                    placement="right-start"
                    bind:this={manualMenu}
                    on:hide={() => (manualInputOpen = false)}
                  >
                    <div class="manual-types-menu">
                      {#if filteredExternalEventTypes.length > 0}
                        <MenuItem on:click={() => onAddAllManualTypes()}>
                          <div class="st-typography-bold manual-types-add-all">
                            Add {filteredExternalEventTypes.length !== $externalEventTypes.length ? 'Matching' : 'All'} +
                          </div>
                        </MenuItem>
                        {#each filteredExternalEventTypes as type}
                          <MenuItem on:click={() => onManualTypeToggled(type.name)}>
                            <input
                              type="checkbox"
                              checked={(dirtyFilter.static_types || []).indexOf(type.name) > -1}
                              tabindex={-1}
                              style:pointer-events="none"
                            />
                            <div class="st-typography-body">{type.name}</div>
                          </MenuItem>
                        {/each}
                      {:else}
                        <MenuItem disabled>No external events matching your filter</MenuItem>
                      {/if}
                    </div>
                  </Menu>
                </div>
                {#if dirtyFilter.static_types?.length}
                  <div class="manual-types-results">
                    {#each dirtyFilter.static_types as name}
                      <!-- TODO: Implement for EE -->
                      <FilterTypeResult {name} activityOrEvent="event" on:remove={() => onManualTypeToggled(name)} />
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
            <div class="filter-section" aria-label="dynamic-types">
              <div class="filter-section-header st-typography-medium">
                <div class="filter-section-title">
                  Dynamically Select Types
                  <div class="hint st-typography-body">Type includes...</div>
                </div>
                <button
                  class="st-button icon"
                  on:click={() => onAddDynamicFilter('dynamic_type_filters')}
                  aria-label="Add Filter"
                  use:tooltip={{ content: 'Add Filter' }}
                >
                  <FilterWithPlusIcon />
                </button>
              </div>
              {#if dirtyFilter.dynamic_type_filters?.length}
                <div class="filter-section-content">
                  <div class="dynamic-filter-content" role="list">
                    {#each dirtyFilter.dynamic_type_filters as filter, i (filter.id)}
                      <DynamicFilter
                        {filter}
                        on:remove={() => onDynamicFilterRemove('dynamic_type_filters', filter.id)}
                        on:change={event => onDynamicFilterChange('dynamic_type_filters', event)}
                        verb={i === 0 ? 'Where' : 'and'}
                        schema={{
                          Type: {
                            does_not_equal: { type: 'variant', values: $externalEventTypes.map(type => type.name) },
                            does_not_include: { type: 'string' },
                            equals: { type: 'variant', values: $externalEventTypes.map(type => type.name) },
                            includes: { type: 'string' },
                          },
                        }}
                      />
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
            <div class="filter-section" aria-label="other-filters">
              <div class="filter-section-header st-typography-medium">
                <div class="filter-section-title">
                  Other Filters
                  <div class="hint st-typography-body">Names, attributes</div>
                </div>
                <button
                  class="st-button icon"
                  aria-label="Add Filter"
                  on:click={() => onAddDynamicFilter('other_filters')}
                  use:tooltip={{ content: 'Add Filter' }}
                >
                  <FilterWithPlusIcon />
                </button>
              </div>
              {#if dirtyFilter.other_filters?.length}
                <div class="filter-section-content">
                  <div class="dynamic-filter-content" role="list">
                    {#each dirtyFilter.other_filters as filter, i (filter.id)}
                      <!-- TODO: Implement for EE -->
                      <DynamicFilter
                        {filter}
                        on:remove={() => onDynamicFilterRemove('other_filters', filter.id)}
                        on:change={event => onDynamicFilterChange('other_filters', event)}
                        verb={i === 0 ? 'Where' : 'and'}
                        schema={{
                          Attribute: {
                            subfields: parameterSubfields,
                          },
                          Name: {
                            does_not_equal: { type: 'string' },
                            does_not_include: { type: 'string' },
                            equals: { type: 'string' },
                            includes: { type: 'string' },
                          },
                        }}
                      />
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <CssGridGutter track={1} type="column" />

          <div class="resulting-types">
            <div class="resulting-types-title st-typography-medium">
              Resulting Types
              <div class="resulting-types-info-container">
                <div class="resulting-types-info"><TagIcon />{matchingTypes.length} types</div>
                <div class="resulting-types-info">
                  <ExternalEventIcon />{instanceCount} instance{pluralize(instanceCount)}
                </div>
              </div>
            </div>
            <Input>
              <div class="search-icon" slot="left"><SearchIcon /></div>
              <input class="st-input w-full" placeholder="Filter types" bind:value={resultingTypesInputValue} />
            </Input>
            <div class="resulting-types-list">
              {#each filteredMatchingTypes as type}
                <!-- TODO: Implement for EE -->
                <FilterTypeResult activityOrEvent="event" name={type.name} removable={false}>
                  <button
                    slot="right"
                    on:click={() => onAddTypeSubfilter(type.name)}
                    class="st-button icon"
                    aria-label="Add Filter"
                    use:tooltip={{ content: 'Add Filter' }}
                  >
                    <FilterWithPlusIcon />
                  </button>
                  <svelte:fragment slot="bottom">
                    {#if dirtyFilter.type_subfilters && dirtyFilter.type_subfilters[type.name] && dirtyFilter.type_subfilters[type.name].length}
                      <div class="resulting-type-filters">
                        {#each dirtyFilter.type_subfilters[type.name] as filter (filter.id)}
                          <DynamicFilter
                            {filter}
                            on:remove={() => onTypeSubfilterRemove(type.name, filter.id)}
                            on:change={event => onTypeSubfilterChange(type.name, event)}
                            verb={''}
                            schema={{
                              Attribute: {
                                // Filter subfields to only those matching this type
                                subfields: parameterSubfields.filter(subfield => {
                                  return subfield.externalEventTypes.indexOf(type.name) > -1;
                                }),
                              },
                              Name: {
                                does_not_equal: { type: 'string' },
                                does_not_include: { type: 'string' },
                                equals: { type: 'string' },
                                includes: { type: 'string' },
                              },
                            }}
                          />
                        {/each}
                      </div>
                    {/if}
                  </svelte:fragment>
                </FilterTypeResult>
              {/each}
              {#if resultingTypesMessage}
                <div class="st-typography-label p-1">{resultingTypesMessage}</div>
              {/if}
            </div>
          </div>
        </CssGrid>
      </div>
    </Draggable>
  {/if}
</div>

<style>
  :global(.external-event-filter-builder) {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 90vh;
    max-width: 95vw;
    min-height: 400px;
    min-width: 600px;
    width: 100%;
  }

  :global(.external-event-filter-builder .header) {
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
    flex-direction: column;
    gap: 8px;
    overflow: auto;
    padding: 8px;
  }

  .resulting-types {
    background: white;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 8px;
  }

  .resulting-types input {
    background: white;
  }

  .resulting-types-title {
    display: flex;
    justify-content: space-between;
    padding-bottom: 8px;
  }

  .resulting-types-info-container {
    display: flex;
    gap: 8px;
  }

  .resulting-types-info {
    color: var(--st-gray-50);
    display: flex;
    flex-direction: row;
    gap: 4px;
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

  :global(.external-event-filter-grid) {
    width: 100%;
  }

  .resulting-type-filters {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
    padding-bottom: 8px;
    padding-left: 16px;
  }
</style>
