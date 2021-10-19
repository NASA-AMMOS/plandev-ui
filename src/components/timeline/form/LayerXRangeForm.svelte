<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Field from '../../form/Field.svelte';
  import InputText from '../../form/InputText.svelte';
  import Label from '../../form/Label.svelte';
  import Select from '../../form/Select.svelte';
  import type { XRangeLayer } from '../../../types';

  const dispatch = createEventDispatcher();

  export let layer: XRangeLayer | null;

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
</script>

{#if layer && layer.chartType === 'x-range'}
  <Field>
    <Label for="color-scheme">Color Scheme</Label>
    <Select
      name="color-scheme"
      value={layer.colorScheme}
      on:change={({ detail: value }) =>
        dispatch('updateLayer', { prop: 'colorScheme', value })}
    >
      {#each colorSchemes as colorScheme}
        <option value={colorScheme.value}>
          {colorScheme.name}
        </option>
      {/each}
    </Select>
  </Field>

  <Field>
    <Label for="opacity">Opacity</Label>
    <InputText
      name="opacity"
      type="number"
      value={layer.opacity}
      on:change={({ detail: value }) =>
        dispatch('updateLayer', { prop: 'opacity', value })}
    />
  </Field>
{/if}
