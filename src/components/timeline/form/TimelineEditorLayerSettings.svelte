<svelte:options immutable={true} />

<script lang="ts">
  import SettingsIcon from '@nasa-jpl/stellar/icons/settings.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { ActivityLayer, Axis, Layer, LineLayer, XRangeLayer } from '../../../types/timeline';
  import { getTarget } from '../../../utilities/generic';
  import { tooltip } from '../../../utilities/tooltip';
  import Input from '../../form/Input.svelte';
  import Menu from '../../menus/Menu.svelte';
  import MenuHeader from '../../menus/MenuHeader.svelte';

  export let layer: Layer;
  export let yAxes: Axis[];

  let layerMenu: Menu;
  let layerAsActivity: ActivityLayer;
  let layerAsLine: LineLayer;
  let layerAsXRange: XRangeLayer;

  $: if (layer) {
    if (layer.chartType === 'activity') {
      layerAsActivity = layer as ActivityLayer;
    } else if (layer.chartType === 'line') {
      layerAsLine = layer as LineLayer;
    } else if (layer.chartType === 'x-range') {
      layerAsXRange = layer as XRangeLayer;
    }
  }

  const dispatch = createEventDispatcher();

  function onInput(event: Event) {
    const { name, value } = getTarget(event);
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
      {#if layer.chartType === 'activity'}
        <Input layout="inline">
          <label for="activityHeight">Activity Height</label>
          <input
            min={0}
            class="st-input w-100"
            name="activityHeight"
            type="number"
            value={layerAsActivity.activityHeight}
            on:input={onInput}
          />
        </Input>
      {:else if layer.chartType === 'line'}
        <Input layout="inline">
          <label for="name">Layer Name</label>
          <input
            autocomplete="off"
            placeholder="Overrides resource name"
            class="st-input w-100"
            name="name"
            type="string"
            value={layerAsLine.name || ''}
            on:input={onInput}
          />
        </Input>
        <Input layout="inline">
          <label for="yAxisId">Y Axis</label>
          <select
            on:input={onInput}
            class="st-select w-100"
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
            class="st-input w-100"
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
            class="st-input w-100"
            name="pointRadius"
            type="number"
            value={layerAsLine.pointRadius}
            on:input={onInput}
          />
        </Input>
      {:else if layer.chartType === 'x-range'}
        <Input layout="inline">
          <label for="name">Layer Name</label>
          <input
            autocomplete="off"
            placeholder="Overrides resource name"
            class="st-input w-100"
            name="name"
            type="string"
            value={layerAsXRange.name || ''}
            on:input={onInput}
          />
        </Input>
        <Input layout="inline">
          <label for="yAxisId">Y Axis</label>
          <select
            on:input={onInput}
            class="st-select w-100"
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
            class="st-input w-100"
            name="opacity"
            type="number"
            value={layerAsXRange.opacity}
            on:input={onInput}
          />
        </Input>
      {/if}
      <Input layout="inline">
        <label for="id">Layer ID</label>
        <input class="st-input w-100" name="id" type="number" value={layer.id} disabled />
      </Input>
      <button class="st-button secondary w-100" style="position: relative" on:click={onDeleteLayer}>Delete Layer</button
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
