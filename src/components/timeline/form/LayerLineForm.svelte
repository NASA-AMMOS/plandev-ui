<script lang="ts">
  import Field from '../../form/Field.svelte';
  import Label from '../../form/Label.svelte';
  import type { Layer, LineLayer } from '../../../types';
  import Grid from '../../ui/Grid.svelte';

  export let layer: Layer | null;

  $: lineLayer = layer as LineLayer | null;
</script>

{#if lineLayer && lineLayer.chartType === 'line'}
  <Grid columns="33% 33% 33%">
    <Field>
      <Label for="lineColor">Line Color</Label>
      <input
        class="w-100"
        name="lineColor"
        type="color"
        value={lineLayer.lineColor}
        on:input
      />
    </Field>
    <Field>
      <Label for="lineWidth">Line Width</Label>
      <input
        class="st-input w-100"
        name="lineWidth"
        type="number"
        value={lineLayer.lineWidth}
        on:input
      />
    </Field>
    <Field>
      <Label for="pointRadius">Point Radius</Label>
      <input
        class="st-input w-100"
        name="pointRadius"
        type="number"
        value={lineLayer.pointRadius}
        on:input
      />
    </Field>
  </Grid>
{/if}
