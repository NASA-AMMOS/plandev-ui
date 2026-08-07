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
  import InfoTip from '../../ui/InfoTip.svelte';
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
  // Clamped on the way out to the field as well as on the way in, because a view that reached the
  // database another way -- a hand-written mutation, an import against an older schema -- can hold a
  // value outside 0-1. LayerLine clamps the same value before drawing with it, so showing the stored
  // number raw meant the form reported an opacity the plot was not using.

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
        <div class="group-header">Line</div>
        <Input layout="inline">
          <!-- Duplicated from the layer row's swatch on purpose. Point Color and Fill Color both fall
               back to this value, so leaving it out of the menu meant the two derived colors showed an
               inherited color with no way to see or change what they inherited from. Both controls
               write the same lineColor field, so they cannot disagree. -->
          <label for="lineColor">Color</label>
          <ColorPresetsPicker
            presetColors={ViewLineLayerColorPresets}
            tooltipText="Line Color"
            type="input"
            value={layerAsLine.lineColor}
            on:input={({ detail: { value } }) => dispatch('input', { name: 'lineColor', value })}
          />
        </Input>
        <Input layout="inline">
          <div class="setting-label">
            <label for="lineWidth">Width</label>
            <InfoTip
              content="Thickness of the line in pixels. Zero hides the line entirely, which is how a points-only plot is drawn."
            />
          </div>
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
          <label for="lineStyle">Style</label>
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
          <div class="setting-label">
            <label for="interpolation">Interpolation</label>
            <InfoTip
              content="How the line gets from one sample to the next. Step holds each value until the next one changes it, which is how a discrete resource actually behaves. Linear and Smooth draw between the samples instead, for a resource that really does change continuously."
            />
          </div>
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
          <!-- Labelled plainly rather than "Line Opacity" now that a section header says which part of
               the layer this belongs to. The field name stays `opacity`, which is what the view stores. -->
          <div class="setting-label">
            <label for="opacity">Opacity</label>
            <InfoTip content="0 to 1, covering the line and its points. The area fill carries its own opacity." />
          </div>
          <input
            min={0}
            max={1}
            step={0.1}
            class="st-input w-full"
            id="opacity"
            name="opacity"
            type="number"
            value={clampOpacity(layerAsLine.opacity, DEFAULT_LINE_OPACITY)}
            on:input={onInput}
          />
        </Input>

        <div class="group-header">Points</div>
        <Input layout="inline">
          <div class="setting-label">
            <label for="showPoints">Show</label>
            <InfoTip
              content="Auto draws one point per sample until there are more samples than pixels to hold them, then drops them so the line stays readable. Always keeps them at any density, Never hides them."
            />
          </div>
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
          <label for="pointShape">Shape</label>
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
          <label for="pointColor">Color</label>
          <ColorPresetsPicker
            presetColors={ViewLineLayerColorPresets}
            tooltipText="Point Color"
            type="input"
            value={layerAsLine.pointColor ?? layerAsLine.lineColor}
            on:input={({ detail: { value } }) => dispatch('input', { name: 'pointColor', value })}
          />
        </Input>
        <Input layout="inline">
          <label for="pointRadius">Radius</label>
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

        <div class="group-header">Area</div>
        <Input layout="inline">
          <div class="setting-label">
            <label for="showFill">Show</label>
            <InfoTip
              content="Fills the space between the line and zero. On an axis set to stack its layers, each fill stops at the total of the layers beneath it instead."
            />
          </div>
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
            <label for="fillColor">Color</label>
            <ColorPresetsPicker
              presetColors={ViewLineLayerColorPresets}
              tooltipText="Fill Color"
              type="input"
              value={layerAsLine.fillColor ?? layerAsLine.lineColor}
              on:input={({ detail: { value } }) => dispatch('input', { name: 'fillColor', value })}
            />
          </Input>
          <Input layout="inline">
            <label for="fillOpacity">Opacity</label>
            <input
              min={0}
              max={1}
              step={0.1}
              class="st-input w-full"
              id="fillOpacity"
              name="fillOpacity"
              type="number"
              value={clampOpacity(layerAsLine.fillOpacity, DEFAULT_LINE_FILL_OPACITY)}
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
          <!-- Auto and Off, with no "On": a value's box is as wide as the time the value holds for, and
               a label that does not fit cannot be made to by drawing it anyway. -->
          <div class="setting-label">
            <label for="labelVisibility">Value Labels</label>
            <InfoTip
              content="Auto writes each value inside its box whenever the text fits, shrinking it a step first. There is no always-on setting because a box is only as wide as the time its value holds for."
            />
          </div>
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
          <div class="setting-label">
            <label for="showAsLinePlot">Line Plot</label>
            <InfoTip
              content="Draws the resource as a line stepping between its values rather than as colored boxes. Useful for seeing how often a state changes; the per-value colors below do not apply."
            />
          </div>
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
          <div class="setting-label">
            <label for="opacity">Opacity</label>
            <InfoTip
              content="External events are drawn part-transparent so a row of overlapping bars stays readable. Raise it when the events do not overlap, or when zero-duration markers are too faint to pick out."
            />
          </div>
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

  /* Section labels over one flat list of a dozen controls. A line layer's settings fall into three
     groups an operator already thinks in -- the line, its points, the area under it -- and naming them
     is also what lets the labels shrink: "Color" under Points cannot be mistaken for the line's, so
     none of them has to carry a prefix that was being ellipsized in a 300px menu. Deliberately less
     dense than it could be. One control per row with its own full label, rather than folding width and
     opacity in beside the color swatch as unlabelled boxes. */
  .group-header {
    align-items: center;
    border-top: 1px solid var(--st-gray-20);
    color: var(--st-gray-60);
    display: flex;
    font-size: 10px;
    font-weight: 500;
    gap: 4px;
    letter-spacing: 0.06em;
    padding-top: 8px;
    text-transform: uppercase;
  }

  /* Keeps the (?) on the label's row rather than letting it wrap under a long label */
  .setting-label {
    align-items: center;
    display: flex;
    gap: 4px;
    min-width: 0;
  }

  .timeline-editor-layer-settings :global(.color-picker) {
    width: min-content;
  }
</style>
