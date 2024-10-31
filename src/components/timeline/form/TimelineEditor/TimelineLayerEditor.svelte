<svelte:options immutable={true} />

<script lang="ts">
  import CloseIcon from '@nasa-jpl/stellar/icons/close.svg?component';
  import FilterIcon from '@nasa-jpl/stellar/icons/filter.svg?component';
  import CopyIcon from 'bootstrap-icons/icons/copy.svg?component';
  import EyeIcon from 'bootstrap-icons/icons/eye.svg?component';
  import { createEventDispatcher } from 'svelte';
  import type { Layer } from '../../../../types/timeline';
  import { getTarget } from '../../../../utilities/generic';
  import { isActivityLayer, isExternalEventLayer, isLineLayer, isXRangeLayer } from '../../../../utilities/timeline';
  import { tooltip } from '../../../../utilities/tooltip';
  import ColorPicker from '../../../form/ColorPicker.svelte';
  import ColorPresetsPicker from '../../../form/ColorPresetsPicker.svelte';

  export let layer: Layer;

  let color: string = '';
  let isColorScheme: boolean = false;
  let name: string = '';

  const dispatch = createEventDispatcher<{
    colorChange: { color: string };
    duplicate: void;
    filterChange: void;
    remove: void;
    rename: { name: string };
    settingsChange: void;
    visibilityChange: void;
  }>();

  $: {
    if (isActivityLayer(layer)) {
      color = layer.activityColor;
      isColorScheme = false;
    } else if (isLineLayer(layer)) {
      color = layer.lineColor;
      isColorScheme = false;
    } else if (isXRangeLayer(layer)) {
      color = layer.colorScheme;
      isColorScheme = true;
    } else if (isExternalEventLayer(layer)) {
      color = layer.externalEventColor;
      isColorScheme = true;
    }
  }

  $: name = getLayerName(layer);

  function onColorPickerInput(event: Event) {
    const { value } = getTarget(event);
    dispatch('colorChange', { color: value as string });
  }

  function getLayerName(layer: Layer) {
    if (isActivityLayer(layer)) {
      name = layer.name || 'Activity Layer';
    } else if (isLineLayer(layer)) {
      name = layer.name || layer.filter.resource || 'Line Layer';
    } else if (isXRangeLayer(layer)) {
      name = layer.name || layer.filter.resource || 'X-Range Layer';
    } else if (isExternalEventLayer(layer)) {
      name = layer.name || 'Events Layer';
    }
    return name;
  }

  function getDefaultLayerName(layer: Layer) {
    if (isActivityLayer(layer)) {
      name = 'Activity Layer';
    } else if (isLineLayer(layer)) {
      name = layer.filter.resource || 'Line Layer';
    } else if (isXRangeLayer(layer)) {
      name = layer.filter.resource || 'X-Range Layer';
    } else if (isExternalEventLayer(layer)) {
      name = 'Events Layer';
    }
    return name;
  }

  // TODO make all timeline editor inputs require enter except arrow key input? Or change this to more of a directive name editor..
  // downside of requiring submit is that most other inputs in aerie are immmediately executed.
  function onLayerNameChange(event: Event) {
    const { value } = getTarget(event);
    const newName = (value as string) || getDefaultLayerName(layer);
    dispatch('rename', { name: newName });
    // Catch the case where we've cleared the input and fallen back to some default value
    // TODO review
    (event.target as HTMLInputElement).value = newName;
  }
</script>

<div class="timeline-layer-editor">
  <div class="left">
    <div class="color">
      {#if isColorScheme}
        <ColorPresetsPicker
          value={color}
          on:input={({ detail: { value } }) => dispatch('colorChange', { color: value })}
        />
      {:else}
        <ColorPicker value={color} on:input={onColorPickerInput} />
      {/if}
    </div>
    <input
      value={name}
      autocomplete="off"
      class="st-input w-100"
      name="layer-name"
      placeholder="Enter layer name"
      on:change={onLayerNameChange}
    />
  </div>
  <div class="actions">
    <button
      on:click|stopPropagation={() => dispatch('duplicate')}
      use:tooltip={{ content: 'Duplicate', placement: 'top' }}
      class="st-button icon"
    >
      <CopyIcon />
    </button>
    <button
      on:click|stopPropagation={() => dispatch('filterChanged')}
      use:tooltip={{ content: 'Filter', placement: 'top' }}
      class="st-button icon"
    >
      <FilterIcon />
    </button>
    <button
      on:click|stopPropagation={() => dispatch('visibilityChange')}
      use:tooltip={{ content: 'Hide', placement: 'top' }}
      class="st-button icon"
    >
      <EyeIcon />
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
  }

  .left,
  .actions {
    align-items: center;
    display: flex;
    gap: 8px;
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
</style>
