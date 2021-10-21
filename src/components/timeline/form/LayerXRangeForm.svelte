<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Field from '../../form/Field.svelte';
  import Label from '../../form/Label.svelte';
  import Grid from '../../ui/Grid.svelte';
  import type { Layer, XRangeLayer } from '../../../types';

  const dispatch = createEventDispatcher();

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

  export let layer: Layer | null;

  $: lineLayer = layer as XRangeLayer;
</script>

{#if lineLayer && lineLayer.chartType === 'x-range'}
  <Grid columns="50% 50%">
    <Field>
      <Label for="color-scheme">Color Scheme</Label>
      <select
        class="st-select w-100"
        name="color-scheme"
        value={lineLayer.colorScheme}
        on:change={e => dispatch('updateLayer', { e, prop: 'colorScheme' })}
      >
        {#each colorSchemes as colorScheme}
          <option value={colorScheme.value}>
            {colorScheme.name}
          </option>
        {/each}
      </select>
    </Field>

    <Field>
      <Label for="opacity">Opacity</Label>
      <input
        class="st-input w-100"
        name="opacity"
        type="number"
        value={lineLayer.opacity}
        on:input={e => dispatch('updateLayer', { e, prop: 'opacity' })}
      />
    </Field>
  </Grid>
{/if}
