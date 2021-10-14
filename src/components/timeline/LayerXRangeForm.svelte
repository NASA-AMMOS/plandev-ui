<script lang="ts">
  import {
    selectedLayerId,
    selectedLayer,
    selectedRowId,
    selectedTimelineId,
    view,
  } from '../../stores/views';
  import Field from '../form/Field.svelte';
  import Label from '../form/Label.svelte';
  import Select from '../form/Select.svelte';
  import type { XRangeLayer } from '../../types';

  $: layer = $selectedLayer as XRangeLayer;

  let colorSchemes = [
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

  function updateLayer(prop: string, value: any) {
    view.updateLayer(
      $selectedTimelineId,
      $selectedRowId,
      $selectedLayerId,
      prop,
      value,
    );
  }
</script>

{#if $selectedLayer.chartType === 'x-range'}
  <Field>
    <Label for="color-scheme">Color Scheme</Label>
    <Select
      name="color-scheme"
      value={layer.colorScheme}
      on:change={({ detail: colorScheme }) =>
        updateLayer('colorScheme', colorScheme)}
    >
      {#each colorSchemes as colorScheme}
        <option value={colorScheme.value}>
          {colorScheme.name}
        </option>
      {/each}
    </Select>
  </Field>
{/if}
