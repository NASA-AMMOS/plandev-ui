<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Field from '../../form/Field.svelte';
  import Label from '../../form/Label.svelte';
  import type { Layer, LineLayer } from '../../../types';

  const dispatch = createEventDispatcher();

  export let layer: Layer | null;

  $: lineLayer = layer as LineLayer | null;

  function onInput(event: Event, prop: string) {
    const { target: eventTarget } = event;
    const target = eventTarget as HTMLInputElement;
    const { value } = target;
    dispatch('updateLayer', { prop, value });
  }
</script>

{#if lineLayer && lineLayer.chartType === 'line'}
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
{/if}
