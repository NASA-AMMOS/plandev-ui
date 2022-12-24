<script lang="ts">
  import Input from '../../../components/form/Input.svelte';
  import { selectedLayer, viewUpdateLayer } from '../../../stores/views';
  import type { XRangeLayer } from '../../../types/timeline';
  import CssGrid from '../../ui/CssGrid.svelte';

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
  <CssGrid columns="1fr 1fr" gap="16px">
    <Input>
      <label for="colorScheme">Color Scheme</label>
      <select class="st-select w-100" name="colorScheme" value={lineLayer.colorScheme} on:change={viewUpdateLayer}>
        {#each colorSchemes as colorScheme}
          <option value={colorScheme.value}>
            {colorScheme.name}
          </option>
        {/each}
      </select>
    </Input>

    <Input>
      <label for="opacity">Opacity</label>
      <input class="st-input w-100" name="opacity" type="number" value={lineLayer.opacity} on:input={viewUpdateLayer} />
    </Input>
  </CssGrid>
{/if}
