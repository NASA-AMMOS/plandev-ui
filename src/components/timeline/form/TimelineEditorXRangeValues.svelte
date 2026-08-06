<svelte:options immutable={true} />

<script lang="ts">
  import { Eye, EyeOff, RotateCcw } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { ViewLineLayerColorPresets } from '../../../constants/view';
  import { allResourceTypes } from '../../../stores/simulation';
  import type { ResourceType } from '../../../types/simulation';
  import type { XRangeLayer, XRangeLayerColorScheme, XRangeValueAppearance } from '../../../types/timeline';
  import { getXRangeColorScale, getXRangeValueDomain } from '../../../utilities/timeline';
  import { tooltip } from '../../../utilities/tooltip';
  import ColorPresetsPicker from '../../form/ColorPresetsPicker.svelte';
  import InfoTip from '../../ui/InfoTip.svelte';

  export let layer: XRangeLayer;

  let addedValue: string = '';

  const dispatch = createEventDispatcher<{
    input: { name: string; value: Record<string, XRangeValueAppearance> };
  }>();

  $: appearance = layer.valueAppearance ?? {};
  $: schema = getResourceSchema($allResourceTypes, layer.filter.resource);
  // Null for a resource whose schema does not enumerate its values, which is what splits this form in
  // two: a listed set to edit in place, or an unknown set to name by hand.
  $: schemaValues = getXRangeValueDomain(schema);
  $: values = getEditableValues(schemaValues, appearance);
  $: schemeColors = getSchemeColors(layer.colorScheme, schemaValues);

  function getResourceSchema(resourceTypes: ResourceType[], resourceName: string | undefined) {
    return resourceTypes.find(({ name }) => name === resourceName)?.schema;
  }

  /**
   * Every value worth a row: the schema's own set where there is one, plus anything already configured.
   *
   * The second half is what keeps a stale entry reachable. A model revision can stop declaring a value
   * the operator had already pinned, and that entry goes on affecting the render either way -- listing
   * only the schema would leave it coloring or hiding a value with nothing in the form to undo it.
   */
  function getEditableValues(
    schemaValues: string[] | null,
    appearance: Record<string, XRangeValueAppearance>,
  ): string[] {
    const configured = Object.keys(appearance);
    if (!schemaValues) {
      return configured.sort();
    }
    return [...schemaValues, ...configured.filter(value => !schemaValues.includes(value)).sort()];
  }

  /**
   * The color each value would take with no override, for the values whose color is knowable.
   *
   * Only the schema's own set reproduces what the canvas paints, since it is the same domain the
   * renderer builds its scale from. A resource whose values come from the data gets its domain from the
   * order values happen to first appear in the profile, which this form never sees -- so those values
   * show no inherited color rather than a confidently wrong one, and so does a value the schema has
   * since dropped.
   */
  function getSchemeColors(colorScheme: XRangeLayerColorScheme, schemaValues: string[] | null): Record<string, string> {
    if (!schemaValues) {
      return {};
    }
    const colorScale = getXRangeColorScale(colorScheme, schemaValues);
    return schemaValues.reduce<Record<string, string>>(
      (colors, value) => ({ ...colors, [value]: colorScale(value) }),
      {},
    );
  }

  function update(value: string, entry: XRangeValueAppearance | null) {
    const next = { ...appearance };
    // An entry with nothing left in it is indistinguishable from no entry, and leaving it behind would
    // grow the saved view with every value an operator toggled and untoggled.
    if (entry === null || (entry.color === undefined && !entry.hidden)) {
      delete next[value];
    } else {
      next[value] = entry;
    }
    dispatch('input', { name: 'valueAppearance', value: next });
  }

  function onColorChange(value: string, color: string) {
    update(value, { ...appearance[value], color });
  }

  function onToggleHidden(value: string) {
    const { hidden, ...rest } = appearance[value] ?? {};
    update(value, hidden ? rest : { ...rest, hidden: true });
  }

  function onAddValue() {
    const value = addedValue.trim();
    if (!value || appearance[value]) {
      addedValue = '';
      return;
    }
    // Given a color up front: an added value has no inherited color to fall back to, so an entry
    // without one would render a row with a blank swatch.
    const nextPreset = ViewLineLayerColorPresets[Object.keys(appearance).length % ViewLineLayerColorPresets.length];
    update(value, { color: nextPreset });
    addedValue = '';
  }

  function onAddKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      onAddValue();
    }
  }
</script>

<div class="value-appearance">
  <div class="header">
    <span class="st-typography-medium">Value Colors</span>
    <InfoTip
      content="Pin a color to a specific resource value so it stays the same across plans and simulations, or hide a value to take it out of the row entirely. Hiding all but one value leaves that state shading the row background."
    />
  </div>

  {#if values.length}
    <div class="value-list">
      {#each values as value (value)}
        {@const entry = appearance[value]}
        {@const hidden = entry?.hidden === true}
        <div class="value-row" class:hidden>
          <!-- An outlined empty swatch rather than a color when there is nothing to inherit: accurate,
               and the picker's own border keeps it visible -->
          <ColorPresetsPicker
            presetColors={ViewLineLayerColorPresets}
            tooltipText="Color for {value}"
            type="input"
            value={entry?.color || schemeColors[value] || 'transparent'}
            on:input={({ detail }) => onColorChange(value, detail.value)}
          />
          <span class="value-name" use:tooltip={{ content: value, placement: 'top' }}>{value}</span>
          <button
            class="st-button icon"
            aria-label={hidden ? `Show ${value}` : `Hide ${value}`}
            use:tooltip={{ content: hidden ? 'Show' : 'Hide', placement: 'top' }}
            on:click={() => onToggleHidden(value)}
          >
            {#if hidden}
              <EyeOff size={14} />
            {:else}
              <Eye size={14} />
            {/if}
          </button>
          <button
            class="st-button icon"
            aria-label="Reset {value}"
            disabled={!entry}
            use:tooltip={{ content: 'Reset to scheme color', placement: 'top' }}
            on:click={() => update(value, null)}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if !schemaValues}
    <!-- Nothing lists the values of a free-form resource, so they get typed in. They are drawn on the
         timeline and shown in its tooltip, which is where an operator reads them off. -->
    <div class="add-value">
      <input
        autocomplete="off"
        class="st-input w-full"
        placeholder="Add a value"
        bind:value={addedValue}
        on:keydown={onAddKeydown}
      />
      <button class="st-button secondary" disabled={!addedValue.trim()} on:click={onAddValue}>Add</button>
    </div>
  {/if}
</div>

<style>
  .value-appearance {
    display: grid;
    gap: 4px;
  }

  .header {
    align-items: center;
    color: var(--st-gray-70);
    display: flex;
    gap: 4px;
  }

  .value-list {
    display: grid;
    gap: 4px;
  }

  .value-row {
    align-items: center;
    display: grid;
    gap: 4px;
    grid-template-columns: min-content 1fr 20px 20px;
  }

  /* Dims the whole row rather than only the eye, so a scan down the list reads which values are out
     without checking each icon. */
  .value-row.hidden .value-name,
  .value-row.hidden :global(.color-preset-picker) {
    opacity: 0.4;
  }

  .value-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value-row :global(.st-button.icon) {
    color: var(--st-gray-50);
    height: 20px;
    min-width: 20px;
    padding: 0;
    width: 20px;
  }

  .value-row :global(.st-button.icon:disabled) {
    color: var(--st-gray-30);
  }

  .add-value {
    display: grid;
    gap: 4px;
    grid-template-columns: 1fr min-content;
  }
</style>
