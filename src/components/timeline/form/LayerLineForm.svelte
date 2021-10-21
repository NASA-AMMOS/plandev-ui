<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Field from '../../form/Field.svelte';
  import Label from '../../form/Label.svelte';
  import type { Layer, LineLayer } from '../../../types';
  import Grid from '../../ui/Grid.svelte';
  import { getInputValue } from '../../../utilities/generic';

  const dispatch = createEventDispatcher();

  export let layer: Layer | null;

  $: lineLayer = layer as LineLayer | null;

  function onInput(event: Event, prop: string) {
    const value = getInputValue(event);
    dispatch('updateLayer', { prop, value });
  }
</script>

{#if lineLayer && lineLayer.chartType === 'line'}
  <Grid columns="33% 33% 33%">
    <Field>
      <Label for="line-color">Line Color</Label>
      <input
        class="w-100"
        name="line-color"
        type="color"
        value={lineLayer.lineColor}
        on:input={e => onInput(e, 'lineColor')}
      />
    </Field>
    <Field>
      <Label for="line-width">Line Width</Label>
      <input
        class="st-input w-100"
        name="line-width"
        type="number"
        value={lineLayer.lineWidth}
        on:input={e => onInput(e, 'lineWidth')}
      />
    </Field>
    <Field>
      <Label for="point-radius">Point Radius</Label>
      <input
        class="st-input w-100"
        name="point-radius"
        type="number"
        value={lineLayer.pointRadius}
        on:input={e => onInput(e, 'pointRadius')}
      />
    </Field>
  </Grid>
{/if}
