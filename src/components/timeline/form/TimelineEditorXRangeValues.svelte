<svelte:options immutable={true} />

<script lang="ts">
  import { Eye, EyeOff, RotateCcw } from 'lucide-svelte';
  import { createEventDispatcher } from 'svelte';
  import { ViewLineLayerColorPresets } from '../../../constants/view';
  import { allResourceTypes, xRangeValueDomains } from '../../../stores/simulation';
  import type { ResourceType } from '../../../types/simulation';
  import type { XRangeLayer, XRangeLayerColorScheme, XRangeValueAppearance } from '../../../types/timeline';
  import { getTarget } from '../../../utilities/generic';
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
  // What the layer has actually seen, for the resources whose schema declares nothing. Only ever a
  // suggestion: it covers the simulation currently loaded, so a value that has not occurred yet is
  // still worth being able to add by hand.
  $: observedValues = layer.filter.resource ? ($xRangeValueDomains[layer.filter.resource] ?? []) : [];
  $: values = getEditableValues(schemaValues, observedValues, appearance);
  $: schemeColors = getSchemeColors(layer.colorScheme, schemaValues ?? observedValues);

  function getResourceSchema(resourceTypes: ResourceType[], resourceName: string | undefined) {
    return resourceTypes.find(({ name }) => name === resourceName)?.schema;
  }

  /**
   * Every value worth a row: the declared set where the schema has one, otherwise the values the data
   * turned out to hold, plus anything already configured either way.
   *
   * That last part is what keeps a stale entry reachable, and it matters in both directions. A model
   * revision can stop declaring a value an operator had already pinned; a resimulation can stop
   * producing one. The entry goes on affecting the render regardless, so listing only the current set
   * would leave it coloring or hiding a value with nothing in the form to undo it.
   */
  function getEditableValues(
    schemaValues: string[] | null,
    observedValues: string[],
    appearance: Record<string, XRangeValueAppearance>,
  ): string[] {
    const known = schemaValues ?? observedValues;
    const extra = Object.keys(appearance).filter(value => !known.includes(value));
    return [...known, ...extra.sort()];
  }

  /**
   * The color each value would take with no override, for the values whose color is knowable.
   *
   * Accurate only for the exact domain the renderer builds its scale from -- the schema's declared set,
   * or for a free-form resource the order its values first appear in the profile, which is why that
   * order is reported up rather than reconstructed here. Anything outside that domain, such as a value
   * the schema or a resimulation has since dropped, gets no swatch rather than a confidently wrong one.
   */
  function getSchemeColors(colorScheme: XRangeLayerColorScheme, domain: string[]): Record<string, string> {
    if (!domain.length) {
      return {};
    }
    const colorScale = getXRangeColorScale(colorScheme, domain);
    return domain.reduce<Record<string, string>>((colors, value) => ({ ...colors, [value]: colorScale(value) }), {});
  }

  function update(value: string, entry: XRangeValueAppearance | null) {
    const next = { ...appearance };
    // An entry with nothing left in it is indistinguishable from no entry, and leaving it behind would
    // grow the saved view with every value an operator toggled and untoggled.
    if (entry === null || (entry.color === undefined && entry.label === undefined && !entry.hidden)) {
      delete next[value];
    } else {
      next[value] = entry;
    }
    dispatch('input', { name: 'valueAppearance', value: next });
  }

  function onColorChange(value: string, color: string) {
    update(value, { ...appearance[value], color });
  }

  function onLabelChange(value: string, event: Event) {
    const { value: label } = getTarget(event);
    const text = label?.toString() ?? '';
    // Emptying the field drops the override rather than storing '', which would draw a box with no text
    // and no way to tell that from a value whose label really is blank.
    const { label: _cleared, ...rest } = appearance[value] ?? {};
    update(value, text ? { ...rest, label: text } : rest);
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
    <span class="st-typography-medium pt-1">Value Colors</span>
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
          <!-- The name column is the label field. A value's drawn text is the one thing about it an
               operator might want to change, and giving it a row of its own would have doubled the
               height of every list; as a placeholder the raw value still shows through whenever no
               override is set, and the tooltip has it either way. -->
          <input
            autocomplete="off"
            class="value-name"
            placeholder={value}
            spellcheck="false"
            use:tooltip={{ content: `Label for ${value}`, placement: 'top' }}
            value={entry?.label ?? ''}
            on:input={onLabelChange.bind(null, value)}
          />
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
            use:tooltip={{ content: 'Reset color, label, and visibility', placement: 'top' }}
            on:click={() => update(value, null)}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if !schemaValues}
    <!-- The observed list only covers what the loaded simulation produced, so a free-form resource keeps
         a way to name a value that has not occurred yet -- and to configure one before any simulation
         has run at all. -->
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

  .value-row.hidden .value-name,
  .value-row.hidden :global(.color-preset-picker) {
    opacity: 0.4;
  }

  .value-name {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    min-width: 0;
    overflow: hidden;
    padding: 2px 4px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .value-name::placeholder {
    color: inherit;
    opacity: 1;
  }

  .value-name:hover {
    background: var(--st-white);
    border-color: var(--st-gray-20);
  }

  .value-name:focus {
    background: var(--st-white);
    border-color: var(--st-utility-blue);
    outline: none;
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
