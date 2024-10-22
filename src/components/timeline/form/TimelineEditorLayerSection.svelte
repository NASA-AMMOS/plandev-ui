<svelte:options immutable={true} />

<script lang="ts">
  import TrashIcon from '@nasa-jpl/stellar/icons/trash.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { ViewDiscreteLayerColorPresets, ViewLineLayerColorPresets } from '../../../constants/view';
  import { externalEventTypes } from '../../../stores/external-event';
  import { activityTypes } from '../../../stores/plan';
  import { externalResourceNames, resourceTypes } from '../../../stores/simulation';
  import type { Axis, Layer, XRangeLayerColorScheme } from '../../../types/timeline';
  import { getTarget } from '../../../utilities/generic';
  import { isActivityLayer, isExternalEventLayer, isLineLayer, isXRangeLayer } from '../../../utilities/timeline';
  import { tooltip } from '../../../utilities/tooltip';
  import ColorPresetsPicker from '../../form/ColorPresetsPicker.svelte';
  import ColorSchemePicker from '../../form/ColorSchemePicker.svelte';
  import CssGrid from '../../ui/CssGrid.svelte';
  import TimelineEditorLayerFilter from './TimelineEditorLayerFilter.svelte';
  import TimelineEditorLayerSelectedFilters from './TimelineEditorLayerSelectedFilters.svelte';
  import TimelineEditorLayerSettings from './TimelineEditorLayerSettings.svelte';

  export let layer: Layer;
  export let yAxes: Axis[];

  const dispatch = createEventDispatcher<{
    handleDeleteLayerClick: object;
    handleUpdateLayerChartType: { value: string | number | boolean | null };
    handleUpdateLayerColor: { value: string };
    handleUpdateLayerColorScheme: { value: XRangeLayerColorScheme };
    handleUpdateLayerFilter: { values: string[] };
    handleUpdateLayerProperty: { name: string; value: string | number | boolean | null };
  }>();

  let filterOptions: string[] = [];
  let filterValues: string[] = [];

  $: {
    if (isActivityLayer(layer)) {
      filterOptions = $activityTypes.map(type => type.name);
    } else if (isExternalEventLayer(layer)) {
      filterOptions = $externalEventTypes.map(type => type.name);
    } else if (isLineLayer(layer) || isXRangeLayer(layer)) {
      filterOptions = $resourceTypes
        .map(type => type.name)
        .concat($externalResourceNames)
        .sort();
    }
  }

  $: {
    // getFilterValuesForLayer
    if (isActivityLayer(layer)) {
      const activityLayer = layer;
      const activityTypes = activityLayer.filter?.activity?.types ?? [];
      filterValues = [...activityTypes];
    } else if (isExternalEventLayer(layer)) {
      // NOTE: if a derivation group is disabled, this doesn't get invoked and does not update. however, on dissociation it does.
      const externalEventLayer = layer;
      const externalEventTypes = externalEventLayer.filter?.externalEvent?.event_types ?? [];
      filterValues = [...externalEventTypes];
    } else if (isLineLayer(layer) || isXRangeLayer(layer)) {
      const resourceLayer = layer;
      const resourceNames = resourceLayer.filter?.resource?.names ?? [];
      filterValues = [...resourceNames];
    }
  }

  function handleDeleteLayerFilterValue(value: string) {
    const values = filterValues.filter(entry => entry !== value);
    dispatch('handleUpdateLayerFilter', { values }); // dispatch update layer filter here with newValues
  }
</script>

<div class="timeline-layer timeline-element">
  <CssGrid columns="1fr 0.75fr 24px 24px 24px" gap="8px" class="editor-section-grid">
    <TimelineEditorLayerFilter
      values={filterValues}
      options={filterOptions}
      {layer}
      on:change={event => {
        const { values } = event.detail;
        dispatch('handleUpdateLayerFilter', { values });
      }}
    />
    <select
      class="st-select w-100"
      name="chartType"
      value={layer.chartType}
      on:change={event => dispatch('handleUpdateLayerChartType', { value: getTarget(event).value })}
    >
      <option value="activity">Activity</option>
      <option value="line">Line</option>
      <option value="x-range">X-Range</option>
      <option value="externalEvent">External Event</option>
    </select>
    <TimelineEditorLayerSettings
      {layer}
      on:input={event => dispatch('handleUpdateLayerProperty', { name: event.detail.name, value: event.detail.value })}
      on:delete={() => dispatch('handleDeleteLayerClick', {})}
      {yAxes}
    />

    {#if isActivityLayer(layer)}
      <ColorPresetsPicker
        presetColors={ViewDiscreteLayerColorPresets}
        tooltipText="Layer Color"
        value={layer.activityColor}
        on:input={event => dispatch('handleUpdateLayerColor', { value: event.detail.value })}
      />
    {:else if isLineLayer(layer)}
      <ColorPresetsPicker
        presetColors={ViewLineLayerColorPresets}
        tooltipText="Layer Color"
        value={layer.lineColor}
        on:input={event => dispatch('handleUpdateLayerColor', { value: event.detail.value })}
      />
    {:else if isXRangeLayer(layer)}
      <ColorSchemePicker
        layout="compact"
        value={layer.colorScheme}
        on:input={event => dispatch('handleUpdateLayerColorScheme', { value: event.detail.value })}
      />
    {:else if isExternalEventLayer(layer)}
      <ColorPresetsPicker
        presetColors={ViewDiscreteLayerColorPresets}
        tooltipText="Layer Color"
        value={layer.externalEventColor}
        on:input={event => dispatch('handleUpdateLayerColor', { value: event.detail.value })}
      />
    {/if}

    <button
      on:click={() => dispatch('handleDeleteLayerClick', {})}
      use:tooltip={{ content: 'Delete Layer', placement: 'top' }}
      class="st-button icon"
    >
      <TrashIcon />
    </button>
  </CssGrid>
  <TimelineEditorLayerSelectedFilters
    chartType={layer.chartType}
    filters={filterValues}
    on:remove={event => handleDeleteLayerFilterValue(event.detail.filter)}
  />
</div>

<style>
  :global(.editor-section-grid form) {
    display: grid;
  }

  :global(.editor-section-grid) {
    align-items: center;
    flex: 1;
    position: relative;
    width: 100%;
  }

  :global(.editor-section-grid-labels > *) {
    min-width: 40px;
  }

  :global(.input.input-stacked.editor-input) {
    display: grid;
    min-width: 40px;
    width: auto;
  }

  :global(.input.input-stacked.editor-input label) {
    display: none;
  }

  :global(.input.input-inline.editor-input) {
    grid-template-columns: 60px auto;
    padding: 0;
  }

  :global(.editor-section-grid form) {
    display: grid;
  }

  :global(.editor-section-grid) {
    align-items: center;
    flex: 1;
    position: relative;
    width: 100%;
  }

  :global(.editor-section-grid-labels > *) {
    min-width: 40px;
  }

  .timeline-layer {
    padding: 4px 16px;
  }

  .timeline-layer {
    align-items: flex-end;
    display: flex;
  }

  :global(.input.input-stacked.editor-input) {
    display: grid;
    min-width: 40px;
    width: auto;
  }

  :global(.input.input-stacked.editor-input label) {
    display: none;
  }

  :global(.input.input-inline.editor-input) {
    grid-template-columns: 60px auto;
    padding: 0;
  }

  .timeline-layer {
    align-items: flex-start;
    flex-direction: column;
  }
</style>
