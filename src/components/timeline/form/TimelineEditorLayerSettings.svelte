<svelte:options immutable={true} />

<script lang="ts">
  import SettingsIcon from '@nasa-jpl/stellar/icons/settings.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { ViewLineLayerColorPresets } from '../../../constants/view';
  import type { Axis, Layer, LineLayer, XRangeLayer } from '../../../types/timeline';
  import { getTarget } from '../../../utilities/generic';
  import {
    DEFAULT_LINE_FILL_OPACITY,
    clampLineFillOpacity,
    isLineLayer,
    isXRangeLayer,
  } from '../../../utilities/timeline';
  import { tooltip } from '../../../utilities/tooltip';
  import ColorPresetsPicker from '../../form/ColorPresetsPicker.svelte';
  import Input from '../../form/Input.svelte';
  import Menu from '../../menus/Menu.svelte';
  import MenuHeader from '../../menus/MenuHeader.svelte';

  export let layer: Layer;
  export let yAxes: Axis[];

  let layerMenu: Menu;
  let layerAsLine: LineLayer;
  let layerAsXRange: XRangeLayer;

  $: if (layer) {
    if (isLineLayer(layer)) {
      layerAsLine = layer;
    } else if (isXRangeLayer(layer)) {
      layerAsXRange = layer;
    }
  }

  const dispatch = createEventDispatcher<{
    delete: void;
    input: {
      name: string;
      value: string | number | boolean | null;
    };
  }>();

  function onInput(event: Event) {
    const { name, value } = getTarget(event);
    // An empty or partially typed number input yields NaN. Persisting that would write a value the
    // view schema rejects, so the view could no longer be exported, and for opacities it silently
    // renders fully opaque since canvas ignores a non-finite globalAlpha. Drop the event instead
    // and let the field settle on the next keystroke.
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return;
    }
    if (name === 'fillOpacity') {
      dispatch('input', { name, value: clampLineFillOpacity(value as number) });
      return;
    }
    dispatch('input', { name, value });
  }

  function onDeleteLayer() {
    dispatch('delete');
  }
</script>

<div style="position: relative;">
  <button
    class="st-button icon timeline-editor-layer-settings"
    use:tooltip={{ content: 'Layer Settings', placement: 'top' }}
    style="position: relative"
    on:click|stopPropagation={() => {
      layerMenu.toggle();
    }}
  >
    <div class="button-inner"><SettingsIcon /></div>
  </button>
  <Menu bind:this={layerMenu} hideAfterClick={false} placement="bottom-end" width={300}>
    <MenuHeader title={`${layer.chartType} Layer Settings`} />
    <div class="body st-typography-body">
      {#if isLineLayer(layer)}
        <Input layout="inline">
          <label for="name">Layer Name</label>
          <input
            autocomplete="off"
            placeholder="Overrides resource name"
            class="st-input w-full"
            name="name"
            type="string"
            value={layer.name || ''}
            on:input={onInput}
          />
        </Input>
        <Input layout="inline">
          <label for="yAxisId">Y Axis</label>
          <select
            on:input={onInput}
            class="st-select w-full"
            data-type="number"
            name="yAxisId"
            value={layerAsLine.yAxisId}
          >
            {#each yAxes as axis}
              <option value={axis.id}>
                {axis.label.text}
              </option>
            {/each}
          </select>
        </Input>
        <Input layout="inline">
          <label for="lineWidth">Line Width</label>
          <input
            min={0}
            class="st-input w-full"
            name="lineWidth"
            type="number"
            value={layerAsLine.lineWidth}
            on:input={onInput}
          />
        </Input>
        <Input layout="inline">
          <label for="pointRadius">Point Radius</label>
          <input
            min={0}
            class="st-input w-full"
            name="pointRadius"
            type="number"
            value={layerAsLine.pointRadius}
            on:input={onInput}
          />
        </Input>
        <Input layout="inline">
          <label for="showFill">Fill Area</label>
          <input
            style:width="max-content"
            checked={layerAsLine.showFill}
            id="showFill"
            name="showFill"
            on:change={onInput}
            type="checkbox"
          />
        </Input>
        {#if layerAsLine.showFill}
          <Input layout="inline">
            <label for="fillColor">Fill Color</label>
            <ColorPresetsPicker
              presetColors={ViewLineLayerColorPresets}
              tooltipText="Fill Color"
              type="input"
              value={layerAsLine.fillColor ?? layerAsLine.lineColor}
              on:input={({ detail: { value } }) => dispatch('input', { name: 'fillColor', value })}
            />
          </Input>
          <Input layout="inline">
            <label for="fillOpacity">Fill Opacity</label>
            <input
              min={0}
              max={1}
              step={0.1}
              class="st-input w-full"
              id="fillOpacity"
              name="fillOpacity"
              type="number"
              value={layerAsLine.fillOpacity ?? DEFAULT_LINE_FILL_OPACITY}
              on:input={onInput}
            />
          </Input>
        {/if}
      {:else if isXRangeLayer(layer)}
        <Input layout="inline">
          <label for="name">Layer Name</label>
          <input
            autocomplete="off"
            placeholder="Overrides resource name"
            class="st-input w-full"
            name="name"
            type="string"
            value={layer.name || ''}
            on:input={onInput}
          />
        </Input>
        <Input layout="inline">
          <label for="yAxisId">Y Axis</label>
          <select
            on:input={onInput}
            class="st-select w-full"
            data-type="number"
            name="yAxisId"
            value={layerAsXRange.yAxisId}
          >
            {#each yAxes as axis}
              <option value={axis.id}>
                {axis.label.text}
              </option>
            {/each}
          </select>
        </Input>
        <Input layout="inline">
          <label for="opacity">Opacity</label>
          <input
            min={0}
            max={1}
            step={0.1}
            class="st-input w-full"
            name="opacity"
            type="number"
            value={layerAsXRange.opacity}
            on:input={onInput}
          />
        </Input>
        <Input layout="inline">
          <label for="showAsLinePlot">Show As Line Plot</label>
          <input
            style:width="max-content"
            checked={layerAsXRange.showAsLinePlot}
            id="showAsLinePlot"
            name="showAsLinePlot"
            on:change={onInput}
            type="checkbox"
          />
        </Input>
      {/if}
      <Input layout="inline">
        <label for="id">Layer ID</label>
        <input class="st-input w-full" name="id" type="number" value={layer.id} disabled />
      </Input>
      <button class="st-button secondary w-full" style="position: relative" on:click={onDeleteLayer}
        >Delete Layer</button
      >
    </div>
  </Menu>
</div>

<style>
  .button-inner {
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;
    position: relative;
    width: 100%;
    z-index: 1;
  }

  .body {
    cursor: auto;
    display: grid;
    gap: 8px;
    padding: 8px;
    text-align: left;
  }

  .body :global(.input-inline) {
    padding: 0;
  }

  .timeline-editor-layer-settings :global(.color-picker) {
    width: min-content;
  }
</style>
