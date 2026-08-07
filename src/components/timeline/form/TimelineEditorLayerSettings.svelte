<svelte:options immutable={true} />

<script lang="ts">
  import SettingsIcon from '@nasa-jpl/stellar/icons/settings.svg?component';
  import { createEventDispatcher } from 'svelte';
  import { ViewLineLayerColorPresets } from '../../../constants/view';
  import type { Axis, ExternalEventLayer, Layer, LineLayer, XRangeLayer } from '../../../types/timeline';
  import { getTarget } from '../../../utilities/generic';
  import {
    DEFAULT_EXTERNAL_EVENT_OPACITY,
    DEFAULT_INTERPOLATION,
    DEFAULT_LINE_FILL_OPACITY,
    DEFAULT_LINE_OPACITY,
    DEFAULT_LINE_STYLE,
    DEFAULT_POINT_SHAPE,
    DEFAULT_SHOW_POINTS_MODE,
    DEFAULT_XRANGE_LABEL_VISIBILITY,
    clampOpacity,
    isExternalEventLayer,
    isLineLayer,
    isXRangeLayer,
  } from '../../../utilities/timeline';
  import { tooltip } from '../../../utilities/tooltip';
  import ColorPresetsPicker from '../../form/ColorPresetsPicker.svelte';
  import Input from '../../form/Input.svelte';
  import Menu from '../../menus/Menu.svelte';
  import MenuHeader from '../../menus/MenuHeader.svelte';
  import TimelineEditorOptionButtons from './TimelineEditorOptionButtons.svelte';
  import TimelineEditorXRangeValues from './TimelineEditorXRangeValues.svelte';

  export let layer: Layer;
  export let yAxes: Axis[];

  let layerMenu: Menu;
  let layerAsLine: LineLayer;
  let layerAsXRange: XRangeLayer;
  let layerAsExternalEvent: ExternalEventLayer;

  $: if (layer) {
    if (isLineLayer(layer)) {
      layerAsLine = layer;
    } else if (isXRangeLayer(layer)) {
      layerAsXRange = layer;
    } else if (isExternalEventLayer(layer)) {
      layerAsExternalEvent = layer;
    }
  }

  const dispatch = createEventDispatcher<{
    delete: void;
    input: {
      name: string;
      value: string | number | boolean | object | null;
    };
  }>();
  /**
   * Fields that must be clamped into 0-1 before being persisted, with the value to fall back to.
   * Canvas silently ignores an out-of-range globalAlpha, so an unclamped value renders as fully
   * opaque instead of visibly wrong, and the view schema rejects it on export.
   */
  const OPACITY_FIELD_DEFAULTS: Record<string, number> = {
    fillOpacity: DEFAULT_LINE_FILL_OPACITY,
    opacity: DEFAULT_LINE_OPACITY,
  };

  function onInput(event: Event) {
    const { name, value } = getTarget(event);
    // An empty or partially typed number input yields NaN. Persisting that would write a value the
    // view schema rejects, so the view could no longer be exported, and for opacities it silently
    // renders fully opaque since canvas ignores a non-finite globalAlpha. Drop the event instead
    // and let the field settle on the next keystroke.
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return;
    }
    if (name in OPACITY_FIELD_DEFAULTS) {
      dispatch('input', { name, value: clampOpacity(value as number, OPACITY_FIELD_DEFAULTS[name]) });
      return;
    }
    dispatch('input', { name, value });
  }

  function onValueAppearanceInput(event: CustomEvent<{ name: string; value: object }>) {
    dispatch('input', event.detail);
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
  <Menu allowOverflow bind:this={layerMenu} hideAfterClick={false} placement="bottom-end" width={300}>
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
          <label for="interpolation">Interpolation</label>
          <TimelineEditorOptionButtons
            options={[
              { id: 'step', label: 'Step' },
              { id: 'linear', label: 'Linear' },
              { id: 'smooth', label: 'Smooth' },
            ]}
            selectedId={layerAsLine.interpolation ?? DEFAULT_INTERPOLATION}
            on:change={({ detail }) => dispatch('input', { name: 'interpolation', value: detail.id })}
          />
        </Input>
        <Input layout="inline">
          <!-- Duplicated from the layer row's swatch on purpose. Point Color and Fill Color both fall
               back to this value, so leaving it out of the menu meant the two derived colors showed an
               inherited color with no way to see or change what they inherited from. Both controls
               write the same lineColor field, so they cannot disagree. -->
          <label for="lineColor">Line Color</label>
          <ColorPresetsPicker
            presetColors={ViewLineLayerColorPresets}
            tooltipText="Line Color"
            type="input"
            value={layerAsLine.lineColor}
            on:input={({ detail: { value } }) => dispatch('input', { name: 'lineColor', value })}
          />
        </Input>
        <Input layout="inline">
          <label for="lineWidth">Line Width</label>
          <input
            min={0}
            class="st-input w-full"
            id="lineWidth"
            name="lineWidth"
            type="number"
            value={layerAsLine.lineWidth}
            on:input={onInput}
          />
        </Input>
        <Input layout="inline">
          <label for="lineStyle">Line Style</label>
          <TimelineEditorOptionButtons
            options={[
              { id: 'solid', label: 'Solid' },
              { id: 'dashed', label: 'Dashed' },
              { id: 'dotted', label: 'Dotted' },
            ]}
            selectedId={layerAsLine.lineStyle ?? DEFAULT_LINE_STYLE}
            on:change={({ detail }) => dispatch('input', { name: 'lineStyle', value: detail.id })}
          />
        </Input>
        <Input layout="inline">
          <!-- "Line Opacity", not "Opacity": Fill Opacity appears right below it once the fill is on,
               and two controls a few rows apart called Opacity and Fill Opacity read as if the first
               governs both. The field name stays `opacity`, which is what the view stores. -->
          <label for="opacity">Line Opacity</label>
          <input
            min={0}
            max={1}
            step={0.1}
            class="st-input w-full"
            id="opacity"
            name="opacity"
            type="number"
            value={layerAsLine.opacity ?? DEFAULT_LINE_OPACITY}
            on:input={onInput}
          />
        </Input>
        <Input layout="inline">
          <label for="pointRadius">Point Radius</label>
          <input
            min={0}
            class="st-input w-full"
            id="pointRadius"
            name="pointRadius"
            type="number"
            value={layerAsLine.pointRadius}
            on:input={onInput}
          />
        </Input>
        <Input layout="inline">
          <label for="pointShape">Point Shape</label>
          <select
            class="st-select w-full"
            id="pointShape"
            name="pointShape"
            value={layerAsLine.pointShape ?? DEFAULT_POINT_SHAPE}
            on:change={onInput}
          >
            <option value="circle">Circle</option>
            <option value="square">Square</option>
            <option value="diamond">Diamond</option>
            <option value="triangle">Triangle</option>
            <option value="cross">Cross</option>
          </select>
        </Input>
        <Input layout="inline">
          <label for="pointColor">Point Color</label>
          <ColorPresetsPicker
            presetColors={ViewLineLayerColorPresets}
            tooltipText="Point Color"
            type="input"
            value={layerAsLine.pointColor ?? layerAsLine.lineColor}
            on:input={({ detail: { value } }) => dispatch('input', { name: 'pointColor', value })}
          />
        </Input>
        <Input layout="inline">
          <label for="showPoints">Show Points</label>
          <TimelineEditorOptionButtons
            options={[
              { id: 'auto', label: 'Auto' },
              { id: 'always', label: 'Always' },
              { id: 'never', label: 'Never' },
            ]}
            selectedId={layerAsLine.showPoints ?? DEFAULT_SHOW_POINTS_MODE}
            on:change={({ detail }) => dispatch('input', { name: 'showPoints', value: detail.id })}
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
          <label for="labelVisibility">Value Labels</label>
          <TimelineEditorOptionButtons
            options={[
              { id: 'auto', label: 'Auto' },
              { id: 'off', label: 'Off' },
            ]}
            selectedId={layerAsXRange.labelVisibility ?? DEFAULT_XRANGE_LABEL_VISIBILITY}
            on:change={({ detail }) => dispatch('input', { name: 'labelVisibility', value: detail.id })}
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
        {#if !layerAsXRange.showAsLinePlot}
          <!-- Left out while the layer draws as a line plot, where the whole resource is one line in
               one color and there is nothing per-value to configure. -->
          <TimelineEditorXRangeValues layer={layerAsXRange} on:input={onValueAppearanceInput} />
        {/if}
      {:else if isExternalEventLayer(layer)}
        <Input layout="inline">
          <label for="name">Layer Name</label>
          <input
            autocomplete="off"
            class="st-input w-full"
            name="name"
            type="string"
            value={layer.name || ''}
            on:input={onInput}
          />
        </Input>
        <Input layout="inline">
          <!-- External events are drawn translucent so a busy row of overlapping bars stays readable.
               That washes out a zero-duration event's marker, which is small enough to need the
               contrast, so the opacity is worth being able to raise. -->
          <label for="opacity">Opacity</label>
          <input
            min={0}
            max={1}
            step={0.1}
            class="st-input w-full"
            id="opacity"
            name="opacity"
            type="number"
            value={layerAsExternalEvent.opacity ?? DEFAULT_EXTERNAL_EVENT_OPACITY}
            on:input={onInput}
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
    /* Scrolls internally rather than growing past the window, following the same pattern as
       PlanNavButton's .menu-body. Viewport-relative rather than a fixed pixel cap so the menu still
       fits on a short window, where a tall fixed cap would overflow whichever side it flipped to. */
    max-height: 60vh;
    overflow: auto;
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
