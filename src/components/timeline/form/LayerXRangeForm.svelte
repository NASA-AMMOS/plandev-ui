<script lang="ts">
  import CssGrid from '../../ui/CssGrid.svelte';
  import { selectedLayer, viewActions } from '../../../stores/views';

  const colorSchemes = [
    { name: 'Accent', value: 'schemeAccent' },
    { name: 'Category 10', value: 'schemeCategory10' },
    { name: 'Dark 2', value: 'schemeDark2' },
    { name: 'Paired', value: 'schemePaired' },
    { name: 'Pastel 1', value: 'schemePastel1' },
    { name: 'Pastel 2', value: 'schemePastel2' },
    { name: 'Set 1', value: 'schemeSet1' },
    { name: 'Set 2', value: 'schemeSet2' },
    { name: 'Set 3', value: 'schemeSet3' },
    { name: 'Tableau 10', value: 'schemeTableau10' },
  ];

  $: lineLayer = $selectedLayer as XRangeLayer;
</script>

{#if lineLayer && lineLayer.chartType === 'x-range'}
  <CssGrid columns="50% 50%">
    <fieldset>
      <label for="colorScheme">Color Scheme</label>
      <select
        class="st-select w-100"
        name="colorScheme"
        value={lineLayer.colorScheme}
        on:change={viewActions.updateLayer}
      >
        {#each colorSchemes as colorScheme}
          <option value={colorScheme.value}>
            {colorScheme.name}
          </option>
        {/each}
      </select>
    </fieldset>

    <fieldset>
      <label for="opacity">Opacity</label>
      <input
        class="st-input w-100"
        name="opacity"
        type="number"
        value={lineLayer.opacity}
        on:input={viewActions.updateLayer}
      />
    </fieldset>
  </CssGrid>
{/if}
