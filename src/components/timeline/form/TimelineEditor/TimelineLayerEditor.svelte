<svelte:options immutable={true} />

<script lang="ts">
  import ChevronDownIcon from '@nasa-jpl/stellar/icons/chevron_down.svg?component';
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import DuplicateIcon from '@nasa-jpl/stellar/icons/duplicate.svg?component';
  import FilterIcon from '@nasa-jpl/stellar/icons/filter.svg?component';
  import { createEventDispatcher } from 'svelte';
  import TimelineLineLayerIcon from '../../../../assets/timeline-line-layer.svg?component';
  import TimelineXRangeLayerIcon from '../../../../assets/timeline-x-range-layer.svg?component';
  import { ViewDiscreteLayerColorPresets, ViewLineLayerColorPresets } from '../../../../constants/view';
  import { externalEventTypes } from '../../../../stores/external-event';
  import { externalResourceNames, resourceTypes } from '../../../../stores/simulation';
  import type { RadioButtonId } from '../../../../types/radio-buttons';
  import type {
    ActivityLayer,
    Axis,
    ChartType,
    ExternalEventLayerFilter,
    Layer,
    ResourceLayerFilter,
  } from '../../../../types/timeline';
  import { isActivityLayer, isExternalEventLayer, isLineLayer, isXRangeLayer } from '../../../../utilities/timeline';
  import { tooltip } from '../../../../utilities/tooltip';
  import ColorPresetsPicker from '../../../form/ColorPresetsPicker.svelte';
  import ColorSchemePicker from '../../../form/ColorSchemePicker.svelte';
  import RadioButton from '../../../ui/RadioButtons/RadioButton.svelte';
  import RadioButtons from '../../../ui/RadioButtons/RadioButtons.svelte';
  import SearchableDropdown from '../../../ui/SearchableDropdown.svelte';
  import TimelineEditorLayerSettings from '../TimelineEditorLayerSettings.svelte';
  import ActivityFilterBuilder from './ActivityFilterBuilder.svelte';

  export let layer: Layer;
  export let yAxes: Axis[] = [];

  let filterMenu: ActivityFilterBuilder;
  let color: string = '';
  let colorPresets: string[] = [];
  let isColorScheme: boolean = false;
  let name: string = '';

  const dispatch = createEventDispatcher<{
    colorChange: { color: string };
    duplicate: void;
    filterChange: { filter: ResourceLayerFilter | ExternalEventLayerFilter };
    remove: void;
    updateChartType: ChartType;
    updateLayer: { property: string; value: string | number | boolean | object | null };
    visibilityChange: void;
  }>();

  $: {
    if (isActivityLayer(layer)) {
      color = layer.activityColor;
      colorPresets = ViewDiscreteLayerColorPresets;
      isColorScheme = false;
    } else if (isLineLayer(layer)) {
      color = layer.lineColor;
      colorPresets = ViewLineLayerColorPresets;
      isColorScheme = false;
    } else if (isXRangeLayer(layer)) {
      color = layer.colorScheme;
      isColorScheme = true;
    } else if (isExternalEventLayer(layer)) {
      color = layer.externalEventColor;
      colorPresets = ViewDiscreteLayerColorPresets;
      isColorScheme = false;
    }
  }

  $: name = getLayerName(layer);

  $: resourceNames = $resourceTypes
    .map(type => type.name)
    .concat($externalResourceNames)
    .sort();

  function getLayerName(layer: Layer) {
    if (isActivityLayer(layer)) {
      name = layer.name;
    } else if (isLineLayer(layer)) {
      name = layer.name || layer.filter.resource || 'Line Layer';
    } else if (isXRangeLayer(layer)) {
      name = layer.name || layer.filter.resource || 'X-Range Layer';
    } else if (isExternalEventLayer(layer)) {
      name = layer.name || 'Events Layer';
    }
    return name;
  }

  function toggleFilterMenu() {
    filterMenu.toggle();
  }

  function getActivityLayerFilterCount(layer: ActivityLayer) {
    return (
      (layer.filter.activity?.static_types?.length ?? 0) +
      (layer.filter.activity?.dynamic_type_filters?.length ?? 0) +
      (layer.filter.activity?.other_filters?.length ?? 0) +
      (layer.filter.activity?.type_subfilters ? Object.keys(layer.filter.activity?.type_subfilters).length : 0)
    );
  }

  function onUpdateChartType(event: CustomEvent<{ id: RadioButtonId }>) {
    dispatch('updateChartType', event.detail.id as ChartType);
  }
</script>

<div class="timeline-layer-editor">
  <div class="left">
    <div class="color">
      {#if isColorScheme}
        <ColorSchemePicker
          layout="compact"
          value={color}
          on:input={({ detail: { value } }) => dispatch('colorChange', { color: value })}
        />
      {:else}
        <ColorPresetsPicker
          value={color}
          presetColors={colorPresets}
          on:input={({ detail: { value } }) => dispatch('colorChange', { color: value })}
        />
      {/if}
    </div>
    {#if isActivityLayer(layer)}
      {@const filterCount = getActivityLayerFilterCount(layer)}
      <ActivityFilterBuilder
        layerName={layer.name}
        filter={layer.filter.activity}
        on:filterChange
        on:rename={({ detail: { name: newName } }) => dispatch('updateLayer', { property: 'name', value: newName })}
        bind:this={filterMenu}
      >
        <button
          aria-label="Toggle activity filter builder modal"
          slot="trigger"
          on:click|stopPropagation={toggleFilterMenu}
          class="st-button icon w-full"
          style:position="relative"
          use:tooltip={{
            content: `Filter Activities${filterCount > 0 ? ` (${filterCount} applied)` : ''}`,
            placement: 'top',
          }}
        >
          <div class="activity-layer-name st-select">
            <div class="activity-layer-name-text">
              {name || 'Activity Layer'}
            </div>
            <div class="activity-layer-name-badge">
              {#if filterCount > 0}
                <div>{filterCount}</div>
              {/if}
              <FilterIcon />
            </div>
          </div>
        </button>
      </ActivityFilterBuilder>
    {:else if isLineLayer(layer) || isXRangeLayer(layer)}
      <SearchableDropdown
        maxListHeight="400px"
        selectedOptionLabel={layer.name}
        selectTooltip={layer.filter.resource || 'Select Resource'}
        showPlaceholderOption={false}
        className="w-full"
        placeholder="Select Resource"
        searchPlaceholder="Filter resources"
        selectedOptionValues={layer.filter.resource ? [layer.filter.resource] : []}
        options={resourceNames.map(resourceName => ({ display: resourceName, value: resourceName }))}
        on:change={({ detail: values }) => dispatch('filterChange', { filter: values.length ? values[0] : '' })}
      >
        <ChevronDownIcon slot="icon" />
      </SearchableDropdown>
    {:else if isExternalEventLayer(layer)}
      <SearchableDropdown
        allowMultiple
        selectedOptionLabel={layer.name}
        showPlaceholderOption={false}
        className="w-full"
        placeholder="Select Event Types"
        selectTooltip="Select Event Types"
        searchPlaceholder="Filter event types"
        selectedOptionValues={layer.filter.externalEvent?.event_types ?? []}
        options={$externalEventTypes.map(type => ({ display: type.name, value: type.name }))}
        on:change={({ detail: values }) => dispatch('filterChange', { filter: { event_types: values } })}
      >
        <ChevronDownIcon slot="icon" />
      </SearchableDropdown>
    {/if}
  </div>
  <div class="actions">
    {#if isLineLayer(layer) || isXRangeLayer(layer)}
      <RadioButtons selectedButtonId={layer.chartType} on:select-radio-button={onUpdateChartType}>
        <RadioButton use={[[tooltip, { content: 'Line', placement: 'top' }]]} id="line">
          <TimelineLineLayerIcon />
        </RadioButton>
        <RadioButton use={[[tooltip, { content: 'X-Range', placement: 'top' }]]} id="x-range">
          <TimelineXRangeLayerIcon />
        </RadioButton>
      </RadioButtons>
    {/if}
    {#if !isActivityLayer(layer)}
      <TimelineEditorLayerSettings
        {layer}
        on:input={event => dispatch('updateLayer', { property: event.detail.name, value: event.detail.value })}
        on:delete={() => dispatch('remove')}
        {yAxes}
      />
    {/if}
    <button
      on:click|stopPropagation={() => dispatch('duplicate')}
      use:tooltip={{ content: 'Duplicate', placement: 'top' }}
      class="st-button icon"
    >
      <DuplicateIcon />
    </button>
    <button
      on:click|stopPropagation={() => dispatch('remove')}
      use:tooltip={{ content: 'Delete', placement: 'top' }}
      class="st-button icon"
    >
      <CloseIcon />
    </button>
  </div>
</div>

<style>
  .timeline-layer-editor {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: space-between;
    padding: 4px 0px;
  }

  .left,
  .actions {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  :global(.actions > .st-button) {
    color: var(--st-gray-50);
  }

  .left {
    flex: 1;
  }

  .actions {
    display: flex;
    gap: 4px;
  }

  .color {
    display: flex;
    height: min-content;
  }

  .activity-layer-name {
    align-items: center;
    display: flex;
    flex: 1;
    gap: 4px;
    justify-content: space-between;
    overflow: hidden;
    padding: 0px 4px;
  }

  .activity-layer-name-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .activity-layer-name-badge {
    align-items: center;
    display: flex;
    gap: 4px;
  }

  .activity-layer-name-badge > div {
    background: var(--st-gray-15);
    border-radius: 2px;
    min-width: 16px;
    padding: 0px 4px;
  }
</style>
