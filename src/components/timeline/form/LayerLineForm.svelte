<script lang="ts">
  import { selectedLayer, viewUpdateLayer } from '../../../stores/views';
  import CssGrid from '../../ui/CssGrid.svelte';

  $: lineLayer = $selectedLayer as LineLayer | null;
</script>

{#if lineLayer && lineLayer.chartType === 'line'}
  <fieldset>
    <label for="yAxisId">Y-Axis Id</label>
    <input class="st-input w-100" name="yAxisId" type="number" value={lineLayer.yAxisId} on:input={viewUpdateLayer} />
  </fieldset>

  <CssGrid columns="33% 33% 33%">
    <fieldset>
      <label for="lineColor">Line Color</label>
      <input class="w-100" name="lineColor" type="color" value={lineLayer.lineColor} on:input={viewUpdateLayer} />
    </fieldset>

    <fieldset>
      <label for="lineWidth">Line Width</label>
      <input
        class="st-input w-100"
        name="lineWidth"
        type="number"
        value={lineLayer.lineWidth}
        on:input={viewUpdateLayer}
      />
    </fieldset>

    <fieldset>
      <label for="pointRadius">Point Radius</label>
      <input
        class="st-input w-100"
        name="pointRadius"
        type="number"
        value={lineLayer.pointRadius}
        on:input={viewUpdateLayer}
      />
    </fieldset>
  </CssGrid>
{/if}
